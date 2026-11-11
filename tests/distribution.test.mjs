import test from 'node:test';
import assert from 'node:assert/strict';
import {hash,releaseVersion,buildIdentity,verifyPayload,verifyRelease,noDowngrade,writeSite,authorizedDistribution} from '../scripts/site.mjs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('promotion rejects prereleases on stable, ambiguous tags, downgrade and conflicting assets',()=>{
 assert.equal(releaseVersion('v0.10.0','stable'),'0.10.0');assert.equal(releaseVersion('v0.10.0-rc.1','beta'),'0.10.0-rc.1');
 for(const [tag,ch]of [['v0.10.0-beta.1','stable'],['v0.10.0','beta'],['main','stable'],['v0.10.0-alpha.1','beta'],['v0.10.0;echo bad','stable']])assert.throws(()=>releaseVersion(tag,ch));
 assert.throws(()=>noDowngrade('0.10.0','0.10.0-rc.1'));assert.throws(()=>noDowngrade('0.10.0-beta.2','0.10.0-beta.1'));noDowngrade('0.10.0-rc.1','0.10.0');
 const data=Buffer.from('approved');verifyPayload(data,{name:'index.html',size:data.length,digest:'sha256:'+hash(data)});
 assert.throws(()=>verifyPayload(Buffer.from('tampered'),{name:'index.html',size:data.length,digest:'sha256:'+hash(data)}));
 assert.throws(()=>verifyRelease({draft:true},'0.10.0'));assert.throws(()=>buildIdentity('<html>old release</html>'));
 assert.throws(()=>authorizedDistribution({},'stable','both'));assert.throws(()=>authorizedDistribution({distribution:{channels:['beta'],targets:['pages']}},'beta','docker'));
 authorizedDistribution({distribution:{channels:['stable'],targets:['pages','docker']}},'stable','both');
});
test('site promotion copies canonical application bytes and records matching payload digests',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-site-'));try{
  const info={version:'0.10.0',commit:'a'.repeat(40),channel:'stable',dirty:false};
  const html=Buffer.from('<script id="studio-build-info" type="application/json">'+JSON.stringify(info)+'</script>');
  await writeSite(dir,{html,blank:html,info,receipt:{version:info.version,commit:info.commit,channel:'stable'}});
  assert.deepEqual(await readFile(join(dir,'index.html')),html);assert.deepEqual(buildIdentity(html.toString()),info);
  const receipt=JSON.parse(await readFile(join(dir,'distribution.json'),'utf8'));assert.equal(receipt.payload['index.html'],hash(html));
 }finally{await rm(dir,{recursive:true,force:true});}
});
