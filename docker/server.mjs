import { createServer } from 'node:http';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredFiles = ['index.html', 'blank.html', 'version.json', 'distribution.json'];
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/plain; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
]);
const safeSegment = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

// Snapshot only public outputs. No directory listing, filesystem writes, or
// request-time filesystem access. Symlinks are forbidden, including docs dirs.
export async function loadSite(directory) {
  const root = resolve(directory);
  if (!(await lstat(root)).isDirectory()) throw new Error('Site must be a real directory');
  const files = new Map();
  async function add(relative) {
    const file = resolve(root, relative);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Not a regular site file: ${relative}`);
    const body = await readFile(file);
    if (!body.length) throw new Error(`Empty site file: ${relative}`);
    files.set('/' + relative, { body, type: contentTypes.get(extname(relative)) });
  }
  for (const relative of requiredFiles) await add(relative);
  async function docs(relative) {
    const stat = await lstat(resolve(root, relative));
    if (stat.isSymbolicLink()) throw new Error(`Symlink in site: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of (await readdir(resolve(root, relative))).sort()) {
        if (safeSegment.test(name)) await docs(relative + '/' + name);
      }
    } else if (stat.isFile() && contentTypes.has(extname(relative))) await add(relative);
  }
  try { await docs('docs'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return files;
}

export async function createStaticServer(directory) {
  const files = await loadSite(directory);
  const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    function send(status, body, type = 'text/plain; charset=utf-8') {
      res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
      res.end(req.method === 'HEAD' ? undefined : body);
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      req.resume();
      send(405, 'Method not allowed\n');
      return;
    }
    let path;
    try {
      const raw = req.url.split('?')[0];
      // Validate before URL normalization can hide traversal. Disallow encoded
      // separators, double encoding, controls, Windows paths and dot segments.
      if (!raw.startsWith('/') || raw.startsWith('//') || /%2f|%5c/i.test(raw)) throw new Error();
      path = decodeURIComponent(raw);
      if (/[\\%\x00-\x20\x7f#]/.test(path) || path.split('/').some(part => part === '.' || part === '..')) throw new Error();
    } catch {
      send(400, 'Bad request\n');
      return;
    }
    if (path === '/healthz') { send(200, 'ok\n'); return; }
    if (path === '/') path = '/index.html';
    if (path === '/docs/' || path === '/docs') path = '/docs/index.html';
    const file = files.get(path);
    if (!file) { send(404, 'Not found\n'); return; }
    send(200, file.body, file.type);
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../site');
  const server = await createStaticServer(directory);
  server.listen(8080, '0.0.0.0', () => console.log('Presentation Studio listening on :8080'));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(error => { process.exitCode = error ? 1 : 0; });
  });
}
