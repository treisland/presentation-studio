// Build identity is embedded in the loaded HTML, independent of network or project data.
const appInfo = Object.freeze(JSON.parse($('studio-build-info').textContent));
let appInfoReady = false;
function appDiagnosticText() {
  return JSON.stringify({application:'Presentation Studio',version:appInfo.version,channel:appInfo.channel,
    commit:appInfo.commit,dirty:appInfo.dirty,imports:appInfo.imports,browser:navigator.userAgent},null,2);
}
const appInfoInit = projectInit;
projectInit = function(...args) {
  const result=appInfoInit(...args);
  if(appInfoReady || projectPlayback)return result;
  appInfoReady=true;
  const dialog=document.createElement('dialog');dialog.id='app-about';dialog.className='app-about';dialog.setAttribute('aria-labelledby','app-about-title');
  dialog.innerHTML='<div class="app-about-heading"><h2 id="app-about-title">About Presentation Studio</h2><button id="app-about-close">Close</button></div><p id="app-about-version"></p><dl><dt>Channel</dt><dd id="app-about-channel"></dd><dt>Build</dt><dd id="app-about-build"></dd></dl><details><summary>Supported imports</summary><p>Native editable projects: format v2. Legacy v1 imports remain supported through the existing legacy importer. Portable AI authoring: v1. Component libraries: v1.</p><p>Application releases and file formats have separate versions. Unsupported future formats are rejected without replacing your work. Export an editable ZIP before moving between sites or browser profiles.</p><p>Policy: test the current and previous format generation before introducing a replacement. Existing legacy support is retained; retirement requires advance release notes and migration guidance.</p></details><p>Diagnostics include application/build details and browser information. Presentation content and local file paths are excluded.</p><div class="app-about-actions"><a id="app-release-notes" target="_blank" rel="noopener noreferrer">Release notes</a><button id="app-copy-diagnostics">Copy diagnostic details</button></div><p id="app-about-status" role="status"></p><textarea id="app-diagnostics" aria-label="Diagnostic details to copy" readonly hidden></textarea>';
  document.body.append(dialog);
  $('app-about-version').textContent='v'+appInfo.version;
  $('app-about-channel').textContent=appInfo.channel;
  $('app-about-build').textContent=appInfo.commit==='unknown'?'Source archive':appInfo.commit.slice(0,12)+(appInfo.dirty?' · modified source':'');
  $('app-release-notes').href='https://github.com/treisland/presentation-studio/blob/'+(appInfo.commit==='unknown'?'main':appInfo.commit)+'/CHANGELOG.md';
  let origin;
  const open=event=>{origin=event.currentTarget;origin.closest('details.hub-menu')?.removeAttribute('open');dialog.showModal();$('app-about-close').focus();};
  $('app-about-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{if(origin?.isConnected&&origin.checkVisibility())origin.focus();});
  $('app-copy-diagnostics').onclick=async()=>{
    const text=appDiagnosticText();
    try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('app-about-status').textContent='Diagnostic details copied.';}
    catch{const field=$('app-diagnostics');field.hidden=false;field.value=text;field.focus();field.select();$('app-about-status').textContent='Select and copy the diagnostic details below.';}
  };
  const make=(id,label)=>{const button=document.createElement('button');button.id=id;button.type='button';button.className='app-version';button.textContent=label;button.setAttribute('aria-label','About Presentation Studio, version '+appInfo.version+', '+appInfo.channel);button.onclick=open;return button;};
  const label='v'+appInfo.version+(appInfo.channel==='stable'?'':' · '+appInfo.channel);
  const footer=document.createElement('footer');footer.className='app-start-footer';footer.append(make('app-start-version',label));$('hub-picker').append(footer);
  document.querySelector('.fe-bottom').append(make('app-editor-version',label));
  $('hub-project-menu').querySelector(':scope > .hub-menu-items').append(make('app-menu-about','About Presentation Studio'));
  return result;
};
