// Session-only help. No step performs authoring, selection, persistence or export actions.
const lcGuides={
  portfolio:[
    ['Shape the story','Select a title or paragraph on the canvas and replace the prompt with your own words. Keep the problem, approach and outcome distinct.','#fe-preview'],
    ['Describe the visual','Open Inspector Content and choose the intended Selected cell in Media Grid. Add or replace its visual there; edit its Caption and Alternative text in the selection-driven Content panel. Use the grid Fit / crop controls for that cell.','#mg-cell'],
    ['Check the layers','Open Layers in the left Slides/Layers dock. Review names, visibility, locks and order without losing the story’s reading order.','#wp-tab-layers'],
    ['Keep a portable copy','Open Project → Export → Editable ZIP. Keep the complete ZIP, then reopen it offline to check text, images and recovery.','#hub-project-menu > summary'],
  ],
  comic:[
    ['Give the character a voice','Select the speech text on the canvas. Dialogue stays editable; keep it concise and check the long-content warning instead of making text tiny.','#fe-preview'],
    ['Read the panel sequence','Follow the numbered sequence left to right. Select each panel and check its independent image, crop and story role. Empty panels remain editable targets.','#fe-preview'],
    ['Caption and describe','Open Inspector Content and choose the intended panel in Media Grid’s Selected cell. Edit Caption and Alternative text in the selection-driven Content panel. A caption tells the story; a description explains the visual.','#mg-cell'],
    ['Save the whole story','Open Project → Export → Editable ZIP. Reopen a copy offline and confirm that dialogue, captions and all panels remain present.','#hub-project-menu > summary'],
  ],
  editorial:[
    ['Set the headline','Edit the headline and, on a cover, the masthead. Check hierarchy and shorten long headlines when the editor flags overlap.','#fe-preview'],
    ['Read complete columns','On the columns slide, read the complete left column before the right. Continue a long article on another slide instead of forcing it into the reserved area.','#fe-preview'],
    ['Connect quote and image','Keep the quote editable on the canvas. Open Inspector Content, choose the visual in Media Grid’s Selected cell and check its Caption and Alternative text in the selection-driven Content panel. Keep source credits in the slide text.','#mg-cell'],
    ['Preserve the edition','Open Project → Export → Editable ZIP. Check the reopened copy offline, including article order, quote, visuals and credits.','#hub-project-menu > summary'],
  ],
};
let lcGuideActive=false,lcGuideFamily='portfolio',lcGuideIndex=0,lcGuideTarget=null,lcGuideReturn=null;
function lcGuideClearTarget(){lcGuideTarget?.classList.remove('lc-guide-target');lcGuideTarget=null;}
function lcGuideShow(){
  lcGuideClearTarget();const entry=lcGuides[lcGuideFamily][lcGuideIndex],label=lcExamples[lcGuideFamily].label;
  $('lc-guide-family').value=lcGuideFamily;$('lc-guide-heading').textContent=label+' walkthrough · '+(lcGuideIndex+1)+' of '+lcGuides[lcGuideFamily].length;
  $('lc-guide-step').textContent=entry[0];$('lc-guide-copy').textContent=entry[1];$('lc-guide-prev').disabled=lcGuideIndex===0;$('lc-guide-next').textContent=lcGuideIndex===lcGuides[lcGuideFamily].length-1?'Finish':'Next';
  lcGuideTarget=document.querySelector(entry[2]);lcGuideTarget?.classList.add('lc-guide-target');
}
function lcCloseGuide(restore=true){
  lcGuideClearTarget();lcGuideActive=false;if($('lc-walkthrough'))$('lc-walkthrough').hidden=true;
  if(!restore)return;const target=lcGuideReturn;if(target?.isConnected){target.focus();if(document.activeElement===target)return;}document.querySelector('#hub-project-menu > summary')?.focus();
}
function lcOpenGuide(){
  if(!projectReady||projectPlayback||boothActive||projectDraftPending||!$('full-editor').open){projectMessage('Open an editable presentation and resolve recovery before opening a walkthrough.');return;}
  lcGuideReturn=document.activeElement;const family=projectModel()?.template?.split('-')[0];lcGuideFamily=Object.hasOwn(lcGuides,family)?family:'portfolio';lcGuideIndex=0;lcGuideActive=true;$('lc-walkthrough').hidden=false;lcGuideShow();$('lc-guide-heading').focus();
}
const lcGuideAccept=projectAcceptPack;
projectAcceptPack=function(...args){const result=lcGuideAccept(...args);lcCloseGuide(false);return result;};
const lcGuideCards=lcExampleCards;
lcExampleCards=function(...args){lcGuideCards(...args);for(const card of $('lc-example-cards').children)if(Object.hasOwn(lcGuides,card.dataset.example)){const badge=card.querySelector('.lc-example-badge');badge.textContent+=' · Optional walkthrough';}};
const lcGuideInit=projectInit;
projectInit=function(){
  lcGuideInit();const panel=document.createElement('aside');panel.id='lc-walkthrough';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Editor walkthrough');
  panel.innerHTML='<div class="lc-guide-head"><h3 id="lc-guide-heading" tabindex="-1"></h3><button id="lc-guide-close" aria-label="Close walkthrough">Close</button></div><label>Walkthrough<select id="lc-guide-family"><option value="portfolio">Portfolio</option><option value="comic">Comic</option><option value="editorial">Editorial</option></select></label><strong id="lc-guide-step"></strong><p id="lc-guide-copy" role="status" aria-live="polite"></p><p class="lc-guide-hint">You make the changes. The guide only points to controls.</p><div class="lc-example-actions"><button id="lc-guide-prev">Previous</button><button id="lc-guide-next">Next</button><button id="lc-guide-replay">Replay</button><button id="lc-guide-skip">Skip guide</button></div>';
  $('full-editor').append(panel);
  const button=document.createElement('button');button.id='lc-walkthrough-open';button.textContent='Editor walkthrough';button.onclick=lcOpenGuide;$('lc-examples-open').after(button);
  const note=document.createElement('p');note.className='lc-guide-hint';note.textContent='Walkthroughs are optional editor cues, separate from starter/demo content. Open Project → Editor walkthrough to replay a Portfolio, Comic or Editorial guide.';$('lc-examples-title').parentElement.append(note);
  $('lc-guide-family').onchange=e=>{lcGuideFamily=e.target.value;lcGuideIndex=0;lcGuideShow();};
  $('lc-guide-prev').onclick=()=>{if(lcGuideIndex>0){lcGuideIndex--;lcGuideShow();}};
  $('lc-guide-next').onclick=()=>{if(lcGuideIndex===lcGuides[lcGuideFamily].length-1)lcCloseGuide();else{lcGuideIndex++;lcGuideShow();}};
  $('lc-guide-replay').onclick=()=>{lcGuideIndex=0;lcGuideShow();};
  $('lc-guide-close').onclick=$('lc-guide-skip').onclick=()=>lcCloseGuide();
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();lcCloseGuide();}});
  $('full-editor').addEventListener('close',()=>lcCloseGuide(false));
};
