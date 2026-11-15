// Browser-local launch preferences. Exported projects retain their direct-open behavior.
const ssPreferenceKey = 'presentation-studio-startup', ssLastKey = 'presentation-studio-last-project';
const ssChoices = ['screen', 'resume', 'blank', 'picker'];
let ssOrigin = null, ssReady = false, ssBusy = false;
function ssRead(key) { try { return localStorage.getItem(key); } catch { return null; } }
function ssWrite(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }
}
function ssMessage(text) { $('ss-message').textContent = text; }
function ssClose() {
  $('ss-screen').close();
  if (ssOrigin?.isConnected && ssOrigin.checkVisibility()) ssOrigin.focus();
  else if ($('full-editor').open) $('hub-project-menu').querySelector('summary').focus();
  else $('open-full-editor').focus();
}
async function ssRefresh() {
  const list = $('ss-recents'); list.replaceChildren();
  try {
    await hubRefresh();
    ssMessage($('hub-message').textContent);
    for (const record of hubRecords.slice(0, 5)) {
      const row = document.createElement('button'); row.className = 'ss-recent';
      row.dataset.projectId = record.pack.meta.id;
      const thumb = document.createElement('span'); thumb.className = 'ss-thumb'; thumb.setAttribute('aria-hidden', 'true');
      thumb.style.setProperty('--ss-accent', nxColor(record.pack.state.brand?.accent, '#5146b6'));
      thumb.textContent = record.pack.state.slides.find(slide => !slide.hidden)?.title || 'Presentation';
      const content = document.createElement('span'), title = document.createElement('strong'), date = document.createElement('small'), arrow = document.createElement('span');
      title.textContent = record.pack.meta.name;
      date.textContent = 'Saved in this browser · ' + (Number.isNaN(Date.parse(record.savedAt)) ? 'Date unavailable' : new Date(record.savedAt).toLocaleString());
      arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true'); content.append(title, date); row.append(thumb, content, arrow);
      row.onclick = () => ssRun(() => {
        if (record.pack.meta.id === projectMeta.id && !projectDraftPending) {
          ssClose(); if (!$('full-editor').open) projectOpen();
          return;
        }
        return hubOpenRecord(record);
      }); list.append(row);
    }
    if (!hubRecords.length) {
      const empty = document.createElement('div'); empty.className = 'ss-empty';
      const title = document.createElement('h3'), detail = document.createElement('p');
      title.textContent = 'A fresh start'; detail.textContent = 'Your recent projects will appear here. Start blank, try an example, or open a saved project.';
      empty.append(title, detail); list.append(empty);
    }
  } catch (error) { ssMessage('Recent projects unavailable. You can still open a saved project. ' + error.message); }
}
async function ssOpen(message = '') {
  if (projectPlayback || boothActive || document.body.classList.contains('obs')) return;
  projectFlush(); vbEnd(false); emClose(); hubMenusClose(); nxCancelTransition(); setPlaying(false); mediaPauseAll();
  ssOrigin = document.activeElement;
  $('ss-startup').value = ssChoices.includes(ssRead(ssPreferenceKey)) ? ssRead(ssPreferenceKey) : 'screen';
  $('ss-appearance').value = studioEditorAppearance;
  $('ss-current').textContent = projectDraftPending ? 'Review draft recovery' : 'Continue current presentation';
  if (!$('ss-screen').open) $('ss-screen').showModal();
  $('ss-title').focus();
  await ssRefresh();
  if (message) ssMessage(message);
}
async function ssRun(action) {
  if (ssBusy) return;
  ssBusy = true;
  try { await action(); }
  catch (error) { ssMessage(error.message); }
  finally { ssBusy = false; }
}
function ssCreateBlank() {
  const state = studioBlankState('Untitled presentation');
  state.slides[0].tree = []; state.slides[0].templateBase = [];
  state.startingState = projectCopy(state);
  projectDraftPending = null;
  projectAcceptPack({ schemaVersion: 2, kind: 'presentation-studio-project', playbackOnly: false,
    meta: { id: projectID('project'), name: state.projectName, updatedAt: new Date().toISOString() },
    state, history: { past: [], future: [] }, checkpoints: [] });
  projectModified();
  if (!$('full-editor').open) projectOpen();
}
// Existing guarded import/recent workflows own project switching and asset checks.
const ssAccept = projectAcceptPack;
projectAcceptPack = function(pack) {
  const result = ssAccept(pack);
  if (!pack.playbackOnly) ssWrite(ssLastKey, pack.meta.id);
  if (ssReady && $('ss-screen').open) {
    ssClose();
    if (!pack.playbackOnly && !$('full-editor').open) projectOpen();
  }
  return result;
};
const ssPersist = hubPersist;
hubPersist = async function(pack, ...args) {
  const result = await ssPersist(pack, ...args);
  if (pack.meta.id === projectMeta.id) ssWrite(ssLastKey, pack.meta.id);
  return result;
};
const ssError = hubError;
hubError = function(error) { ssError(error); if (ssReady && $('ss-screen').open) ssMessage(error?.message || String(error)); };
async function ssBoot() {
  await projectRecoveryReady;
  const enabled = $('studio-entry')?.textContent.trim() === 'true';
  const playbackRoute = ['obs', 'kiosk', 'loop', 'pilot', 'detection', 'steps', 'qa', 'remqa', 'remsteps', 'product'].some(key => params.has(key));
  if (!enabled || projectPlayback || boothActive || pvOutput || window.__studioAudienceBootstrap || playbackRoute) return;
  if (params.get('start') === 'present') return;
  if (params.get('start') === 'editor') { projectOpen(); return; }
  // Do not steal focus after the user has already entered a workflow during recovery lookup.
  if (document.querySelector('dialog[open]')) return;
  if (projectDraftPending) { await ssOpen('A recovery draft is available. You can review it or leave it safely in Recent projects while you open or create another presentation.'); return; }
  const preference = ssRead(ssPreferenceKey);
  if (preference === 'blank') {
    try { await hubDatabase(); ssCreateBlank(); }
    catch (error) { await ssOpen('Could not create an automatic draft. ' + error.message); }
    return;
  }
  if (preference === 'resume') {
    try {
      const id = ssRead(ssLastKey);
      if (!id) throw new Error('No last project is available.');
      await hubDatabase();
      const record = await projectDBGet('projects', id);
      if (!record) throw new Error('The last project is no longer saved in this browser.');
      const loaded = await hubReadRecord(record);
      // Initial launch has no user changes. Avoid persisting the bundled demo just to resume.
      for (const [path, blob] of loaded.assets) mediaRemember(path, blob);
      projectAcceptPack(loaded.pack); hubSaveState = 'saved'; hubSavedAt = record.savedAt;
      projectStatus(); projectRecoveryBanner(); projectOpen(); return;
    } catch (error) { await ssOpen('Could not resume the last project. ' + error.message); return; }
  }
  await ssOpen(preference === 'picker' ? 'Choose Open project to browse for a saved ZIP or JSON. Your browser requires a click to open the file picker.' : '');
  if (preference === 'picker') $('ss-open').focus();
}
const ssInit = projectInit;
projectInit = function(...args) {
  const result = ssInit(...args);
  if (ssReady || projectPlayback) return result;
  ssReady = true;
  const screen = document.createElement('dialog'); screen.id = 'ss-screen'; screen.setAttribute('aria-labelledby', 'ss-title');
  screen.innerHTML = `<header class="ss-header"><span class="ss-brand"><span aria-hidden="true">▱</span> Presentation Studio</span><a href="https://docs.pres-studio.com/" target="_blank" rel="noopener noreferrer">Help ↗</a></header>
    <div class="ss-body"><div class="ss-welcome"><h1 id="ss-title" tabindex="-1">Welcome to Presentation Studio</h1><p>Pick up where you left off, or start something new.</p></div>
    <div class="ss-columns"><section class="ss-projects" aria-labelledby="ss-recent-title"><div class="ss-section-heading"><h2 id="ss-recent-title">Recent projects</h2><button id="ss-manage">Manage recents</button></div><div id="ss-recents"></div>
    <div class="ss-open-row"><button id="ss-open">▱ &nbsp; Open project</button><p>Browse for a saved project ZIP or JSON.</p></div></section>
    <section class="ss-actions" aria-label="Start a presentation"><button id="ss-blank" class="ss-action"><span class="ss-icon" aria-hidden="true">＋</span><span><strong>Blank presentation</strong><small>Start with an empty canvas.</small></span><span aria-hidden="true">→</span></button>
    <button id="ss-template" class="ss-action"><span class="ss-icon" aria-hidden="true">▦</span><span><strong>Choose a template</strong><small>Find a starting point.</small></span><span aria-hidden="true">→</span></button>
    <div class="ss-example"><div class="ss-example-art" aria-hidden="true"><strong>Small ideas.<br>Big possibilities.</strong><i></i></div><div><h2>New here?</h2><p>Explore a ready-to-edit example.</p><button id="ss-example">Try an example</button></div></div></section></div>
    <p id="ss-message" role="status" aria-live="polite"></p><button id="ss-current">Continue current presentation</button>
    <footer class="ss-footer"><label for="ss-startup">On startup</label><select id="ss-startup"><option value="screen">Show start screen</option><option value="resume">Resume last project</option><option value="blank">Create blank presentation</option><option value="picker">Open project picker</option></select>
    <label for="ss-appearance">Appearance</label><select id="ss-appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><a href="https://docs.pres-studio.com/" target="_blank" rel="noopener noreferrer">User guide ↗</a></footer></div>`;
  document.body.append(screen);
  const start = document.createElement('button'); start.id = 'ss-menu'; start.textContent = 'Start screen…'; start.setAttribute('role', 'menuitem');
  start.onclick = () => ssRun(() => ssOpen()); $('hub-project-menu').querySelector('.hub-menu-items').prepend(start);
  $('ss-current').onclick = () => { ssClose(); if (!$('full-editor').open) projectOpen(); };
  screen.addEventListener('cancel', event => { event.preventDefault(); $('ss-current').click(); });
  screen.addEventListener('keydown', event => event.stopPropagation());
  $('ss-open').onclick = () => $('hub-file').click();
  $('ss-manage').onclick = () => hubOpenPicker();
  $('ss-blank').onclick = () => ssRun(() => hubGuard(ssCreateBlank));
  $('ss-template').onclick = () => lcOpenExamples();
  $('ss-example').onclick = () => { lcOpenExamples(); if ($('lc-examples').open) lcSelectExample('studio', 'demo'); };
  $('ss-startup').onchange = event => {
    const saved = ssWrite(ssPreferenceKey, event.target.value);
    ssMessage(saved ? 'Startup preference saved for this browser.' : 'Your browser could not save this preference. It applies only while this screen is open.');
    if (!saved) event.target.value = 'screen';
  };
  $('ss-appearance').onchange = event => studioSetEditorAppearance(event.target.value);
  void ssBoot().catch(error => ssOpen('Startup could not finish. ' + error.message));
  return result;
};
