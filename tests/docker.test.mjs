import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createStaticServer, loadSite } from '../docker/server.mjs';
import {execFileSync} from 'node:child_process';

test('source-only builds stage a development site without Git or npm dependencies',async t=>{
  const root=await mkdtemp(join(tmpdir(),'studio-source-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const path of ['package.json','build.config.json','LICENSE','THIRD_PARTY_NOTICES.md','src','templates','vendor','examples','docs/ai'])await cp(new URL('../'+path,import.meta.url),join(root,path),{recursive:true});
  await mkdir(join(root,'scripts'));
  for(const file of ['build.mjs','site.mjs','delivery.mjs'])await cp(new URL('../scripts/'+file,import.meta.url),join(root,'scripts',file));
  const env={...process.env,STUDIO_SOURCE_COMMIT:'unknown'};
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,env});
  execFileSync(process.execPath,['scripts/site.mjs','local'],{cwd:root,env});
  const info=JSON.parse(await readFile(join(root,'site/version.json'),'utf8'));
  assert.equal(info.channel,'development');assert.equal(info.commit,'unknown');assert.equal(info.dirty,true);
  assert.equal((await loadSite(join(root,'site'))).has('/index.html'),true);
  // Providing a source revision is a hint, never clean release authorization.
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,env:{...env,STUDIO_SOURCE_COMMIT:'a'.repeat(40)}});
  const hinted=JSON.parse(await readFile(join(root,'dist/version.json'),'utf8'));
  assert.equal(hinted.commit,'a'.repeat(40));assert.equal(hinted.channel,'development');assert.equal(hinted.dirty,true);
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'studio-static-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = join(root, 'site');
  await mkdir(join(site, 'docs'), { recursive: true });
  for (const [path, body] of Object.entries({
    'index.html': '<html>studio</html>', 'blank.html': '<html>blank</html>',
    'version.json': '{"version":"0.10.0-beta.1"}', 'distribution.json': '{"review":true}',
    'docs/index.html': '<html>docs</html>',
    'docs/guide.md': '# Guide', 'docs/image.svg': '<svg/>',
    'package.json': '{"private":true}', 'docs/secret.env': 'secret', 'docs/executable.js': 'bad()',
  })) await writeFile(join(site, path), body);
  await writeFile(join(root, 'secret.txt'), 'outside site');
  return { root, site };
}

async function serving(t, site) {
  const server = await createStaticServer(site);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves only public outputs with correct types and no stale channel caching', async t => {
  const { site } = await fixture(t);
  const get = await serving(t, site);
  for (const [path, body, type] of [
    ['/', '<html>studio</html>', 'text/html'], ['/blank.html', '<html>blank</html>', 'text/html'],
    ['/version.json', '{"version":"0.10.0-beta.1"}', 'application/json'],
    ['/distribution.json', '{"review":true}', 'application/json'],
    ['/docs/', '<html>docs</html>', 'text/html'], ['/docs/guide.md', '# Guide', 'text/plain'],
    ['/docs/image.svg', '<svg/>', 'image/svg+xml'], ['/healthz', 'ok\n', 'text/plain'],
    ['/%69ndex.html?cache=old', '<html>studio</html>', 'text/html'],
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.body, body, path);
    assert.ok(response.headers['content-type'].startsWith(type));
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    const head = await get(path, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
    assert.equal(head.headers['content-length'], String(Buffer.byteLength(body)));
  }
  for (const path of ['/package.json', '/Dockerfile', '/docker/server.mjs', '/docs/secret.env', '/docs/executable.js', '/missing', '/docs/no-directory-listing/']) {
    assert.equal((await get(path)).status, 404, path);
  }
});

test('rejects traversal, malformed encoding and unsupported methods before lookup', async t => {
  const { site } = await fixture(t);
  const get = await serving(t, site);
  for (const path of ['/../secret.txt', '/docs/../../index.html', '/%2e%2e/secret.txt', '/docs/%2E%2E/index.html',
    '/docs%2fguide.md', '/docs%5cguide.md', '/%252e%252e/secret.txt', '/%00', '/%0a', '/%', '/%ff', '//index.html', '/docs\\guide.md']) {
    assert.equal((await get(path)).status, 400, path);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
    const response = await get('/index.html', method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, 'GET, HEAD');
  }
  const missing = await get('/missing', 'HEAD');
  assert.equal(missing.status, 404);
  assert.equal(missing.body, '');
});

test('fails closed for missing/empty required payload and snapshots files without writes', async t => {
  const { site } = await fixture(t);
  const get = await serving(t, site);
  await writeFile(join(site, 'index.html'), 'replaced after startup');
  assert.equal((await get('/')).body, '<html>studio</html>');
  await unlink(join(site, 'version.json'));
  await assert.rejects(loadSite(site), { code: 'ENOENT' });
  await writeFile(join(site, 'version.json'), '');
  await assert.rejects(loadSite(site), /Empty site file/);
});

test('rejects directory junctions and file symlinks instead of following outside the site', async t => {
  const { root, site } = await fixture(t);
  // Windows junctions do not require developer mode or elevated privileges.
  await symlink(root, join(site, 'docs', 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(loadSite(site), /Symlink in site/);
  await rm(join(site, 'docs', 'escape'));
  await symlink(root, join(root, 'linked-site'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(loadSite(join(root, 'linked-site')), /real directory/);
  if (process.platform !== 'win32') {
    await unlink(join(site, 'index.html'));
    await symlink(join(root, 'secret.txt'), join(site, 'index.html'));
    await assert.rejects(loadSite(site), /Not a regular site file/);
  }
});
