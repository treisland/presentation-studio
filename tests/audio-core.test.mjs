import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const core=vm.runInNewContext(readFileSync(new URL('../src/runtime/audio-core.js',import.meta.url),'utf8')+';audioCore');
const track={src:'assets/audio-original.wav',name:'Original.wav',mime:'audio/wav',bytes:400,durationMs:1000,volume:1};
test('audio roles retain original references with bounded authored metadata',()=>{
 const raw={...core.empty(),mode:'slide',slides:{slide1:{...track,advanceOnEnd:true,paddingMs:500}},music:{...track,loop:true}};
 const saved=core.settings(raw,new Set(['slide1']));assert.equal(saved.music.src,saved.slides.slide1.src);assert.equal(saved.slides.slide1.paddingMs,500);
 for(const changes of [{bytes:0},{bytes:core.maxBytes+1},{durationMs:Infinity},{volume:-1},{src:'assets/../private.wav'},{mime:'text/html'},{playhead:5}])assert.throws(()=>core.track({...track,...changes},'overall'));
 assert.throws(()=>core.settings(raw,new Set(['other'])));
 assert.throws(()=>core.settings({...raw,mode:'both'}));
 assert.throws(()=>core.track({...track,advanceOnEnd:true,paddingMs:-1},'slide'));
 assert.throws(()=>core.track({...track,loop:'yes'},'music'));
 assert.equal(core.mime('recording.MP3',''),'audio/mpeg');
 assert.throws(()=>core.mime('recording.mp3','audio/ogg'));
});
