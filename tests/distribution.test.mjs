import test from 'node:test';
import assert from 'node:assert/strict';
import {hash,releaseVersion,buildIdentity,verifyPayload,verifyRelease,noDowngrade,writeSite,authorizedDistribution} from '../scripts/site.mjs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {publishedPayload} from '../scripts/site.mjs';
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
test('full promotion verifies tagged authorization, platform checks, workflow and loaded identity before use',async()=>{
 const original=globalThis.fetch,commit='a'.repeat(40),version='0.10.0-beta.1',tag='v'+version;
 const info={version,commit,channel:'beta',dirty:false};const html=Buffer.from('<script id="studio-build-info" type="application/json">'+JSON.stringify(info)+'</script>');
 const names=['presentation-studio.html','presentation-studio-blank.html','presentation-studio-v'+version+'.zip','studio-demo-editable.zip'];
 const blobs=Object.fromEntries(names.map(name=>[name,name.endsWith('.html')?html:Buffer.from('verified archive bytes')]));
 const assets=names.map(name=>({name,size:blobs[name].length,digest:'sha256:'+hash(blobs[name]),state:'uploaded',url:'https://api.github.com/asset/'+name}));
 const plan={publish:true,version,notes:'docs/releases/'+version+'.md',manualGatesPassed:true,evidence:['recorded'],distribution:{channels:['beta'],targets:['pages','docker']}};
 const files={'release-plan.json':plan,'package.json':{version}};let failure='';
 globalThis.fetch=async url=>{
  url=String(url);if(url.startsWith('https://api.github.com/asset/')){const name=url.split('/').at(-1),data=failure==='hash'?Buffer.from('tampered'):blobs[name];return new Response(data);}
  const path=url.split('/repos/treisland/presentation-studio/')[1];let value;
  if(path==='releases/tags/'+tag)value={id:1,tag_name:tag,draft:false,published_at:'2026-11-10',prerelease:true,assets};
  else if(path==='git/ref/tags/'+tag)value={object:{sha:commit,type:'commit'}};
  else if(path==='compare/'+commit+'...main')value={status:'ahead'};
  else if(path.startsWith('contents/')){const file=path.slice(9).split('?')[0];value={content:Buffer.from(JSON.stringify(file==='release-plan.json'&&failure==='authorization'?{...plan,distribution:{}}:files[file])).toString('base64')};}
  else if(path.startsWith('commits/'))value={check_runs:['validate (ubuntu-latest)','validate (windows-latest)'].map(name=>({name,app:{id:15368},status:'completed',conclusion:failure==='checks'?'failure':'success'}))};
  else if(path.startsWith('actions/'))value={workflow_runs:[{id:2,head_sha:commit,head_branch:tag,event:'push',status:'completed',conclusion:failure==='workflow'?'failure':'success'}]};
  else throw Error('Unexpected API path: '+path);
  return new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
 };
 try{const payload=await publishedPayload(tag,'beta','both');assert.deepEqual(payload.html,html);assert.equal(payload.receipt.commit,commit);
  for(failure of ['authorization','checks','workflow','hash'])await assert.rejects(()=>publishedPayload(tag,'beta','both'));
 }finally{globalThis.fetch=original;}
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
