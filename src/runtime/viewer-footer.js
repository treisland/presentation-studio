// Shared viewer controls retain the existing playback engine and action IDs.
let vfReturnFocus = null, vfPage = 0;
const vfPageSize = 24;
function vfModels() {
  if (!projectReady) return [];
  const visible = new Set(projectState.sections.filter(s => !s.hidden).map(s => s.id));
  return projectState.slides.filter(s => !s.hidden && visible.has(s.group));
}
function vfSync() {
  if (!$('vf-title')) return;
  const current = slides[index], models = vfModels();
  $('vf-title').textContent = current?.dataset.title || 'Presentation';
  const groups = projectReady ? projectState.sections.filter(s => !s.hidden && s.name.trim() && models.some(m => m.group === s.id)) : [];
  $('menu').textContent = groups.length >= 2 ? 'Sections' : 'Slides';
  $('menu').title = 'Find a slide (M)';
  $('menu').hidden = models.length <= 1;
  for (const id of ['prev','next','vf-count']) $(id).hidden = slides.length <= 1;
  $('vf-count').textContent = `${index + 1} / ${slides.length}`;
  $('vf-count').setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}. Find a slide`);
  const position = slides.length > 1 ? index / (slides.length - 1) * 100 : 100;
  $('vf-position-fill').style.width = position + '%';
  $('vf-position').setAttribute('aria-valuenow', String(index + 1));
  $('vf-position').setAttribute('aria-valuemax', String(slides.length || 1));
  $('vf-position').setAttribute('aria-valuetext', `Slide ${index + 1} of ${slides.length}`);
  const chrome = projectReady && current ? visibilitySettings(projectState, current.dataset.mediaId) : {footer:true,number:true};
  $('vf-title').hidden = !chrome.footer;
  $('vf-position').hidden = !chrome.footer;
  $('vf-count').hidden ||= !chrome.number;
}
function vfTiming() {
  if (!$('vf-countdown')) return;
  const current = slides[index], cfg = mediaGetAssignment(current?.dataset.mediaId);
  const video = current?.querySelector('video.media-asset');
  let remaining = Number(current?.dataset.time) - elapsed / 1000;
  if (cfg?.advance === 'ended' && video && Number.isFinite(video.duration)) remaining = video.duration - video.currentTime;
  const completionVideo = cfg?.advance === 'ended' && video && Number.isFinite(video.duration) && !video.closest('.media-box')?.classList.contains('is-missing');
  const timed = playing && (completionVideo || !mediaHoldSlide()) && Number.isFinite(remaining);
  $('vf-countdown').hidden = !timed;
  const text = timed ? `${Math.max(0, Math.ceil(remaining))}s` : '';
  if ($('vf-countdown').textContent !== text) $('vf-countdown').textContent = text;
}
function vfNavigate(model) {
  const live = projectModel(model.id);
  if (!live || !vfModels().some(m => m.id === live.id)) { vfNavigator(); return; }
  closeMenu(false);
  // Prefer the current loop when it contains the target; otherwise its section.
  if (!slides.some(s => s.dataset.mediaId === live.id)) switchDeck(live.group, false);
  const target = slides.findIndex(s => s.dataset.mediaId === live.id);
  if (target >= 0) show(target);
  setPlaying(false);
}
function vfNavigator() {
  const query = $('vf-search').value.trim().toLocaleLowerCase();
  const models = vfModels(), matches = models.filter(m => m.title.toLocaleLowerCase().includes(query));
  const pages = Math.max(1, Math.ceil(matches.length / vfPageSize));
  vfPage = Math.min(vfPage, pages - 1);
  const list = $('vf-results'); list.replaceChildren();
  const start = vfPage * vfPageSize, current = slides[index]?.dataset.mediaId;
  const groups = projectState.sections;
  for (const model of matches.slice(start, start + vfPageSize)) {
    const button = document.createElement('button');
    button.className = 'vf-slide'; button.dataset.slideId = model.id;
    const thumb = document.createElement('span'); thumb.className = 'we-thumbnail vf-thumbnail';
    const text = document.createElement('span'), title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = `${models.indexOf(model) + 1}. ${model.title}`;
    detail.textContent = groups.find(s => s.id === model.group)?.name || 'Slides';
    text.append(title, detail);
    if (model.id === current) {
      button.setAttribute('aria-current','true');
      const marker = document.createElement('small'); marker.textContent = 'Currently presenting'; text.append(marker);
    }
    button.append(thumb,text); button.onclick = () => vfNavigate(model); list.append(button);
    weThumb(button,model);
  }
  if (!matches.length) { const empty = document.createElement('p'); empty.textContent = 'No matching slides. Try another title or clear the search.'; list.append(empty); }
  $('vf-result-count').textContent = `${matches.length} matching slides · Page ${vfPage + 1} of ${pages}`;
  $('vf-page-prev').disabled = vfPage === 0;
  $('vf-page-next').disabled = vfPage + 1 === pages;
}
function vfMount() {
  const controls = $('controls'); controls.classList.add('vf-footer');
  const position = document.createElement('div'); position.id = 'vf-position';
  position.setAttribute('role','progressbar'); position.setAttribute('aria-label','Deck position'); position.setAttribute('aria-valuemin','1');
  const fill = document.createElement('span'); fill.id = 'vf-position-fill'; position.append(fill);
  const left = document.createElement('div'); left.className = 'vf-left';
  const title = document.createElement('span'); title.id = 'vf-title'; left.append(title,$('menu'));
  const center = document.createElement('div'); center.className = 'vf-center';
  const countdown = document.createElement('span'); countdown.id = 'vf-countdown'; countdown.setAttribute('role','timer'); countdown.setAttribute('aria-live','off'); countdown.title='Time remaining on this slide';
  center.append($('prev'),$('play'),$('next'),countdown);
  const right = document.createElement('div'); right.className = 'vf-right';
  const count = document.createElement('button'); count.id = 'vf-count'; count.onclick = openMenu;
  right.append(count,$('full'),$('open-full-editor'),$('hub-player-more'));
  const more = right.querySelector('.hub-menu-items');
  for (const id of ['hub-presentations','browse-questions','qa','steps']) more.append($(id));
  controls.append(position,left,center,right);
  const compact = () => {
    if (innerWidth < 640) more.append(count,$('open-full-editor'));
    else { right.prepend(count); right.insertBefore($('open-full-editor'),$('hub-player-more')); }
    if (innerWidth < 560) more.prepend($('full'));
    else right.insertBefore($('full'),$('open-full-editor').parentElement===right?$('open-full-editor'):$('hub-player-more'));
  };
  addEventListener('resize',compact); compact();
  const nav = document.createElement('section'); nav.id = 'vf-navigator';
  nav.innerHTML = '<label for="vf-search">Find a slide by title</label><input id="vf-search" type="search" autocomplete="off" placeholder="Search slide titles"><p id="vf-result-count" role="status"></p><div id="vf-results"></div><div class="vf-pages"><button id="vf-page-prev">Previous results</button><button id="vf-page-next">Next results</button></div><h3>Sections and playback loops</h3>';
  $('section-menu').insertBefore(nav,document.querySelector('.section-options'));
  $('section-menu-title').textContent = 'Find a slide';
  $('vf-search').oninput = () => { vfPage = 0; vfNavigator(); };
  for (const [id,delta] of [['vf-page-prev',-1],['vf-page-next',1]]) $(id).onclick = () => { vfPage += delta; vfNavigator(); $('vf-results').querySelector('button')?.focus(); };
  new ResizeObserver(() => { for (const button of $('vf-results').querySelectorAll('.vf-slide')) { const holder = button.querySelector('.we-thumbnail'), root = holder.firstElementChild; if(root) root.style.transform = `scale(${holder.clientWidth / 1920})`; } }).observe($('section-menu'));
  vfSync(); vfTiming();
}
const vfInit = projectInit;
projectInit = function(...args) { const result = vfInit(...args); vfMount(); return result; };
const vfRender = render;
render = function(...args) { const result = vfRender(...args); vfSync(); return result; };
const vfProgress = progress;
progress = function(...args) { const result = vfProgress(...args); vfTiming(); return result; };
const vfPlay = setPlaying;
setPlaying = function(...args) { const result = vfPlay(...args); vfTiming(); return result; };
const vfOpen = openMenu;
openMenu = function(...args) {
  if ($('section-menu').open) return;
  vfReturnFocus = document.activeElement;
  const result = vfOpen(...args);
  if ($('vf-search')) { $('vf-search').value = ''; vfPage = 0; vfNavigator(); $('vf-search').focus(); }
  return result;
};
const vfClose = closeMenu;
closeMenu = function(...args) { const result = vfClose(...args); if(vfReturnFocus?.isConnected) vfReturnFocus.focus(); return result; };
// Existing click properties captured earlier function objects; route through wrappers.
$('menu').onclick = () => openMenu();
$('menu-close').onclick = () => closeMenu();
