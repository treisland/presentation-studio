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
 assert.equal(core.mime('take.webm','video/webm'),'audio/webm');
 assert.equal(core.mime('take.WEBM','VIDEO/WEBM; codecs=opus'),'audio/webm');
 assert.equal(core.mime('take.webm','audio/webm;codecs=opus'),'audio/webm');
 assert.throws(()=>core.mime('take.webm','video/mp4'));
 assert.throws(()=>core.mime('take.mp3','video/webm'));
 assert.throws(()=>core.mime('recording.mp3','audio/ogg'));
});

test('build identity advertises guarded native v6 without changing authoring/component generations',()=>{const source=readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');assert.match(source,/native:\[2,3,4,5,6\]/);assert.match(source,/authoring:\[1,2\],library:\[1\]/);});

test('optional advancement policies are bounded, slide-scoped and preserve legacy absence',()=>{const raw={...core.empty(),advancement:{mode:'auto',seconds:8,paddingMs:500,overrides:{one:{mode:'narration',seconds:12,paddingMs:700}}}};assert.equal(core.settings(raw,new Set(['one'])).advancement.overrides.one.paddingMs,700);assert.equal(core.settings(core.empty()).advancement,undefined);for(const changes of [{mode:'invalid'},{seconds:0},{paddingMs:-1},{overrides:{unknown:{mode:'manual',seconds:8,paddingMs:500}}}])assert.throws(()=>core.settings({...raw,advancement:{...raw.advancement,...changes}},new Set(['one'])));});
