/* Contoso Agent-Native Engineering Workshop: interface behaviour.
   Theme, story and developer modes, menu drawer, step progress, search, screenshot viewer, copy buttons. */
(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };
  let DATA = { chapters: [] };
  try { DATA = JSON.parse($('#cw-data').textContent); } catch (e) { /* no data block */ }
  const chapters = DATA.chapters || [];
  const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>'
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hdrOffset = () => ($('.hdr') ? $('.hdr').getBoundingClientRect().height : 60);

  // ---------------------------------------------------------------- toast
  let toastEl = null, toastTimer = 0;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  // ---------------------------------------------------------------- theme
  const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    $$('.look-btn').forEach(b => {
      const label = t === 'dark' ? 'Use light colours' : 'Use dark colours';
      b.setAttribute('aria-label', label);
      b.title = label;
    });
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  $$('.look-btn').forEach(b => b.addEventListener('click', () => {
    const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set('cw-theme', t);
    applyTheme(t);
  }));
  if (darkMQ && darkMQ.addEventListener) {
    darkMQ.addEventListener('change', e => { if (!store.get('cw-theme', '')) applyTheme(e.matches ? 'dark' : 'light'); });
  }

  // ---------------------------------------------------------------- story and developer modes
  const MODE_KEY = 'contoso-workshop-devmode';
  function applyMode(dev) {
    root.setAttribute('data-mode', dev ? 'dev' : 'story');
    $$('[data-mode-set]').forEach(b => b.setAttribute('aria-pressed', String((b.getAttribute('data-mode-set') === 'dev') === dev)));
  }
  applyMode(root.getAttribute('data-mode') === 'dev');
  $$('[data-mode-set]').forEach(b => b.addEventListener('click', () => {
    const dev = b.getAttribute('data-mode-set') === 'dev';
    if ((root.getAttribute('data-mode') === 'dev') === dev) return;
    store.set(MODE_KEY, dev ? '1' : '0');
    applyMode(dev);
    toast(dev ? 'Developer mode: files, YAML and internals are shown' : 'Story mode: internals are hidden');
  }));

  // ---------------------------------------------------------------- overlays share inert handling
  const pageParts = () => $$('.hdr, .hero, .stats, .shell > .main, .ftr, .to-top');
  function setInert(on, keep) {
    pageParts().forEach(el => {
      if (keep && el.contains(keep)) return;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  }
  function trapTab(container, e) {
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', container).filter(el => el.offsetParent !== null || el === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------------------------------------------------------------- menu drawer
  const outline = $('#outline');
  const backdrop = $('.backdrop');
  const menuBtns = $$('.menu-btn');
  const deskMQ = window.matchMedia ? matchMedia('(min-width: 1024px)') : { matches: true };
  const drawerMode = () => body.classList.contains('layout-landing') || !deskMQ.matches;
  let drawerReturn = null;
  function openDrawer() {
    if (!outline) return;
    drawerReturn = document.activeElement;
    outline.classList.add('open');
    outline.setAttribute('role', 'dialog');
    outline.setAttribute('aria-modal', 'true');
    if (backdrop) { backdrop.hidden = false; requestAnimationFrame(() => backdrop.classList.add('show')); }
    menuBtns.forEach(b => b.setAttribute('aria-expanded', 'true'));
    body.classList.add('no-scroll');
    setInert(true);
    setTimeout(() => {
      const cur = $('a.item[aria-current="page"]', outline);
      if (cur) { const bottom = cur.offsetTop + cur.offsetHeight + 24; if (bottom > outline.clientHeight) outline.scrollTop = bottom - outline.clientHeight * 0.75; }
      const c = $('.outline-close', outline);
      if (c) c.focus({ preventScroll: true });
    }, 40);
  }
  function closeDrawer(restore = true) {
    if (!outline || !outline.classList.contains('open')) return;
    outline.classList.remove('open');
    outline.removeAttribute('role');
    outline.removeAttribute('aria-modal');
    if (backdrop) { backdrop.classList.remove('show'); setTimeout(() => { if (!outline.classList.contains('open')) backdrop.hidden = true; }, 240); }
    menuBtns.forEach(b => b.setAttribute('aria-expanded', 'false'));
    body.classList.remove('no-scroll');
    setInert(false);
    if (restore && drawerReturn && drawerReturn.focus) drawerReturn.focus({ preventScroll: true });
  }
  menuBtns.forEach(b => b.addEventListener('click', () => (outline && outline.classList.contains('open') ? closeDrawer() : openDrawer())));
  if (backdrop) backdrop.addEventListener('click', () => closeDrawer());
  $$('.outline-close').forEach(b => b.addEventListener('click', () => closeDrawer()));
  if (outline) {
    outline.addEventListener('click', e => { if (e.target.closest('a') && drawerMode()) closeDrawer(false); });
    outline.addEventListener('keydown', e => { if (outline.classList.contains('open')) trapTab(outline, e); });
  }
  if (deskMQ.addEventListener) deskMQ.addEventListener('change', () => { if (!drawerMode()) closeDrawer(false); });

  // ---------------------------------------------------------------- step progress
  const DONE_KEY = 'cw-done';
  const readDone = () => {
    try { const v = JSON.parse(store.get(DONE_KEY, '[]')); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); }
  };
  let done = readDone();
  const allSteps = [].concat(...chapters.map(c => c.steps.map(s => s.id)));
  const saveDone = () => store.set(DONE_KEY, JSON.stringify(Array.from(done)));
  const statsOf = c => { const n = c.steps.length, d = c.steps.filter(s => done.has(s.id)).length; return { n, d, p: n ? d / n : 0 }; };
  const chapterOf = id => chapters.find(c => c.steps.some(s => s.id === id));
  const nextStep = () => { for (const c of chapters) for (const s of c.steps) if (!done.has(s.id)) return { c, s }; return null; };
  const renderers = [];

  function renderProgress() {
    $$('section.step[id]').forEach(sec => {
      const on = done.has(sec.id);
      sec.classList.toggle('is-done', on);
      const b = $('.done-btn', sec);
      if (b) {
        b.setAttribute('aria-pressed', String(on));
        const t = $('.t', b);
        if (t) t.textContent = on ? 'Done' : 'Mark done';
        b.title = on ? 'Mark this step as not done' : 'Mark this step as done';
      }
    });
    chapters.forEach(c => {
      const st = statsOf(c);
      $$('[data-ch="' + c.n + '"]').forEach(el => { el.style.setProperty('--p', String(st.p)); el.classList.toggle('full', st.p === 1); });
      $$('[data-ch-label="' + c.n + '"]').forEach(el => { el.textContent = st.d + ' of ' + st.n + ' steps done'; });
      $$('[data-ch-status="' + c.n + '"]').forEach(el => { el.textContent = st.p === 1 ? 'Completed' : st.d ? st.d + ' of ' + st.n + ' steps done' : st.n + ' steps'; });
      $$('[data-ch-card="' + c.n + '"]').forEach(el => { el.classList.toggle('is-complete', st.p === 1); el.classList.toggle('is-started', st.d > 0 && st.p < 1); });
    });
    $$('.outline a[data-step]').forEach(a => a.classList.toggle('done', done.has(a.getAttribute('data-step'))));
    const total = allSteps.length;
    const d = allSteps.filter(id => done.has(id)).length;
    $$('[data-total]').forEach(el => el.style.setProperty('--p', String(total ? d / total : 0)));
    $$('[data-total-label]').forEach(el => { el.textContent = d + ' of ' + total + ' steps'; });
    $$('[data-hero-progress]').forEach(el => { el.hidden = !d; el.textContent = d + ' of ' + total + ' steps done on this device.'; });
    const nx = nextStep();
    $$('[data-continue]').forEach(a => {
      if (!a.hasAttribute('data-start-label')) { a.setAttribute('data-start-label', a.textContent); a.setAttribute('data-start-href', a.getAttribute('href')); }
      if (!d) { a.textContent = a.getAttribute('data-start-label'); a.setAttribute('href', a.getAttribute('data-start-href')); return; }
      if (nx) { a.setAttribute('href', nx.c.href + '#' + nx.s.id); a.textContent = 'Continue with step ' + nx.s.no; }
      else { a.setAttribute('href', 'chapter-7.html#checkpoint'); a.textContent = 'All steps done: see the wrap-up'; }
    });
    renderers.forEach(fn => fn());
  }

  $$('section.step[id]').forEach(sec => {
    const head = $('.step-head', sec);
    if (!head) return;
    const no = ($('.step-no', sec) || {}).textContent || '';
    const acts = document.createElement('div');
    acts.className = 'step-actions';
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'icon-btn step-link';
    link.setAttribute('aria-label', 'Copy a link to step ' + no);
    link.title = 'Copy a link to this step';
    link.innerHTML = SVG.link;
    link.addEventListener('click', () => copyLink(sec.id));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'done-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<span class="box">' + SVG.check + '</span><span class="t">Mark done</span><span class="sr-only"> step ' + esc(no) + '</span>';
    btn.addEventListener('click', () => {
      if (done.has(sec.id)) done.delete(sec.id); else done.add(sec.id);
      saveDone();
      renderProgress();
      const c = chapterOf(sec.id);
      if (done.has(sec.id) && c && statsOf(c).p === 1) toast('Chapter ' + c.n + ' complete');
    });
    acts.appendChild(link);
    acts.appendChild(btn);
    head.appendChild(acts);
  });

  const curCh = chapters.find(c => c.href === DATA.page);
  const cp = $('#checkpoint');
  if (curCh && cp) {
    let anchor = cp;
    while (anchor.nextElementSibling && anchor.nextElementSibling.matches('.tip, .cards')) anchor = anchor.nextElementSibling;
    const wrap = document.createElement('div');
    wrap.className = 'cp-actions';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-primary';
    b.addEventListener('click', () => {
      curCh.steps.forEach(s => done.add(s.id));
      saveDone();
      renderProgress();
      toast('Chapter ' + curCh.n + ' complete');
    });
    wrap.appendChild(b);
    anchor.insertAdjacentElement('afterend', wrap);
    renderers.push(() => {
      const st = statsOf(curCh);
      b.disabled = st.p === 1;
      b.textContent = st.p === 1 ? 'Chapter ' + curCh.n + ' complete' : 'Mark all ' + st.n + ' steps in this chapter done';
    });
  }
  $$('[data-reset-progress]').forEach(b => b.addEventListener('click', () => {
    if (!done.size) { toast('There is no progress to reset'); return; }
    if (window.confirm('Clear your workshop progress on this device?')) { done = new Set(); saveDone(); renderProgress(); toast('Progress cleared'); }
  }));
  window.addEventListener('storage', e => { if (e.key === DONE_KEY) { done = readDone(); renderProgress(); } });

  // ---------------------------------------------------------------- copy
  function legacyCopy(text) {
    const active = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    body.removeChild(ta);
    if (active && active.focus) active.focus({ preventScroll: true });
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => { if (!legacyCopy(text)) throw new Error('copy failed'); });
    }
    return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }
  function copyLink(id) {
    const url = location.href.split('#')[0] + '#' + id;
    copyText(url).then(() => toast('Link copied'), () => toast(url));
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }
  $$('pre').forEach(pre => {
    const block = pre.closest('.cmd');
    const src = $('code', pre) || pre;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'copy-btn';
    b.innerHTML = (block ? SVG.copy : '') + '<span>Copy</span>';
    b.setAttribute('aria-label', block ? 'Copy: ' + (block.getAttribute('data-label') || 'command') : 'Copy code');
    const label = $('span', b);
    b.addEventListener('click', () => {
      const text = src.textContent.replace(/\s+$/, '');
      copyText(text).then(() => {
        label.textContent = 'Copied';
        b.classList.add('ok');
        setTimeout(() => { label.textContent = 'Copy'; b.classList.remove('ok'); }, 1600);
      }, () => {
        const r = document.createRange();
        r.selectNodeContents(src);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        label.textContent = 'Press Ctrl+C';
        setTimeout(() => { label.textContent = 'Copy'; }, 2500);
      });
    });
    if (block && $('.cmd-head', block)) $('.cmd-head', block).appendChild(b); else pre.appendChild(b);
  });
  $$('.content h2[id]').forEach(h => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'h-anchor';
    b.setAttribute('aria-label', 'Copy a link to this section');
    b.title = 'Copy a link to this section';
    b.innerHTML = SVG.link;
    b.addEventListener('click', () => copyLink(h.id));
    h.appendChild(b);
  });

  // ---------------------------------------------------------------- outline: current section
  const spyLinks = $$('.outline .sub a[href^="#"]');
  const spyTargets = [];
  spyLinks.forEach(a => {
    const el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (el) spyTargets.push({ el, a });
  });
  spyTargets.sort((x, y) => (x.el.compareDocumentPosition(y.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  let spyOn = null;
  function spy() {
    if (!spyTargets.length) return;
    const y = hdrOffset() + 96;
    let pick = null;
    for (const t of spyTargets) { if (t.el.getBoundingClientRect().top <= y) pick = t; else break; }
    const a = pick ? pick.a : null;
    if (a === spyOn) return;
    if (spyOn) spyOn.classList.remove('on');
    spyOn = a;
    if (!a) return;
    a.classList.add('on');
    if (outline && !drawerMode()) {
      const r = a.getBoundingClientRect(), o = outline.getBoundingClientRect();
      if (r.top < o.top + 40 || r.bottom > o.bottom - 24) outline.scrollTop += r.top - o.top - o.height / 3;
    }
  }

  // ---------------------------------------------------------------- reading progress and back to top
  const readBar = $('.read-progress span');
  const toTop = $('.to-top');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      if (readBar) readBar.style.setProperty('--read', p.toFixed(4));
      if (toTop) toTop.classList.toggle('show', window.scrollY > window.innerHeight * 0.9);
      spy();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }));
  if (outline && !drawerMode()) {
    const cur = $('a.item[aria-current="page"]', outline);
    if (cur) outline.scrollTop = Math.max(0, cur.offsetTop - 90);
  }

  // ---------------------------------------------------------------- screenshot viewer
  const zoomables = $$('.shot .frame, .docimg img');
  let lb = null, lbIndex = 0, lbReturn = null, touchX = null;
  function buildViewer() {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Screenshot viewer');
    lb.innerHTML = '<div class="lb-stage"><img alt=""></div>' +
      '<div class="lb-side"><p class="lb-count"></p><div class="lb-cap"></div><div class="lb-legend"></div>' +
      '<a class="lb-open" target="_blank" rel="noopener">Open the full-size image</a></div>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close the viewer">' + SVG.close + '</button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous image">' + SVG.left + '</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next image">' + SVG.right + '</button>';
    body.appendChild(lb);
    $('.lb-close', lb).addEventListener('click', closeViewer);
    $('.lb-prev', lb).addEventListener('click', () => showImage(lbIndex - 1));
    $('.lb-next', lb).addEventListener('click', () => showImage(lbIndex + 1));
    const stage = $('.lb-stage', lb);
    $('img', stage).addEventListener('click', e => { e.stopPropagation(); stage.classList.toggle('zoomed'); });
    stage.addEventListener('click', e => { if (e.target === stage) closeViewer(); });
    stage.addEventListener('touchstart', e => { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (touchX === null || stage.classList.contains('zoomed')) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 60) showImage(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    });
    lb.addEventListener('keydown', e => trapTab(lb, e));
  }
  function showImage(i) {
    if (!zoomables.length) return;
    lbIndex = (i + zoomables.length) % zoomables.length;
    const el = zoomables[lbIndex];
    const fig = el.closest('figure');
    const img = el.tagName === 'IMG' ? el : $('img', el);
    const big = el.tagName === 'A' ? el.getAttribute('href') : (img.currentSrc || img.src);
    const view = $('.lb-stage img', lb);
    view.src = big;
    view.alt = img.alt || '';
    $('.lb-stage', lb).classList.remove('zoomed');
    const cap = fig ? $('figcaption', fig) : null;
    $('.lb-cap', lb).innerHTML = cap ? cap.innerHTML : esc(img.alt || '');
    const legend = $('.lb-legend', lb);
    legend.innerHTML = '';
    const list = fig ? $('.callouts', fig) : null;
    if (list) legend.appendChild(list.cloneNode(true));
    $('.lb-count', lb).textContent = 'Image ' + (lbIndex + 1) + ' of ' + zoomables.length;
    $('.lb-open', lb).href = big;
    const many = zoomables.length > 1;
    $('.lb-prev', lb).hidden = !many;
    $('.lb-next', lb).hidden = !many;
  }
  function openViewer(i) {
    if (!lb) buildViewer();
    lbReturn = document.activeElement;
    showImage(i);
    lb.hidden = false;
    body.classList.add('no-scroll');
    setInert(true);
    $('.lb-close', lb).focus({ preventScroll: true });
  }
  function closeViewer() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    body.classList.remove('no-scroll');
    setInert(false);
    if (lbReturn && lbReturn.focus) lbReturn.focus({ preventScroll: true });
  }
  zoomables.forEach((el, i) => {
    if (el.tagName === 'IMG') {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Enlarge: ' + (el.alt || 'image'));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(i); } });
    } else {
      el.setAttribute('aria-label', 'Enlarge: ' + (($('img', el) || {}).alt || 'screenshot'));
    }
    el.addEventListener('click', e => { e.preventDefault(); openViewer(i); });
  });

  // ---------------------------------------------------------------- search
  const sModal = $('#search');
  const sInput = $('#search-input');
  const sList = $('#search-results');
  const sStatus = $('#search-status');
  const KIND = { page: 'Page', step: 'Step', section: 'Section', cmd: 'Command' };
  let INDEX = null, loading = null, results = [], sel = 0, sReturn = null;
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    if (!loading) {
      loading = fetch(DATA.search).then(r => r.json()).then(j => (INDEX = j)).catch(() => {
        loading = null;
        if (sList) sList.innerHTML = '<li class="s-empty">Search could not load. Check your connection and try again.</li>';
        return [];
      });
    }
    return loading;
  }
  function highlight(s, toks) {
    const t = toks.filter(x => x.length > 1);
    if (!t.length) return esc(s);
    const re = new RegExp('(' + t.map(reEsc).join('|') + ')', 'ig');
    return String(s).split(re).map((part, i) => (i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part))).join('');
  }
  function snippet(e, toks) {
    const src = e.x || e.c || '';
    const low = norm(src);
    let at = -1;
    for (const t of toks) { at = low.indexOf(t); if (at >= 0) break; }
    if (at < 0) {
      const c = e.c || '';
      const lc = norm(c);
      for (const t of toks) { const j = lc.indexOf(t); if (j >= 0) { const s0 = Math.max(0, j - 40); return '<code>' + highlight(c.slice(s0, s0 + 120), toks) + '</code>'; } }
      return esc(src.slice(0, 150)) + (src.length > 150 ? '\u2026' : '');
    }
    const start = Math.max(0, at - 50);
    const s = (start ? '\u2026' : '') + src.slice(start, start + 170) + (start + 170 < src.length ? '\u2026' : '');
    return highlight(s, toks);
  }
  function rank(q) {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    const out = [];
    INDEX.forEach((e, order) => {
      if (!e.tn) { e.tn = norm(e.t); e.xn = norm(e.x); e.cn = norm(e.c); }
      let score = 0;
      for (const tok of toks) {
        const it = e.tn.indexOf(tok);
        if (it >= 0) score += it === 0 ? 16 : (/[\s.\-:/(]/.test(e.tn[it - 1]) ? 11 : 6);
        else if (e.xn.indexOf(tok) >= 0) score += 3;
        else if (e.cn.indexOf(tok) >= 0) score += 3;
        else return;
      }
      score += { page: 4, step: 3, section: 2, cmd: 1 }[e.k] || 0;
      out.push({ e, score, order });
    });
    out.sort((a, b) => b.score - a.score || a.order - b.order);
    const groups = new Map();
    out.slice(0, 40).forEach(o => { if (!groups.has(o.e.p)) groups.set(o.e.p, []); groups.get(o.e.p).push(o.e); });
    return { toks, list: [].concat(...groups.values()) };
  }
  function render(toks, emptyText) {
    if (!results.length) {
      sList.innerHTML = '<li class="s-empty">' + emptyText + '</li>';
      sStatus.textContent = 'No results';
      sInput.removeAttribute('aria-activedescendant');
      return;
    }
    let html = '', last = null;
    results.forEach((e, i) => {
      if (e.p !== last) { html += '<li class="s-grp" role="presentation">' + esc(e.p) + '</li>'; last = e.p; }
      html += '<li role="option" id="sr-' + i + '" aria-selected="' + (i === sel) + '"><a href="' + esc(e.u) + '" tabindex="-1" data-i="' + i + '">' +
        '<span class="s-kind s-' + e.k + '">' + KIND[e.k] + '</span><span class="s-t">' + highlight(e.t, toks) + '</span>' +
        '<span class="s-x">' + snippet(e, toks) + '</span></a></li>';
    });
    sList.innerHTML = html;
    sStatus.textContent = results.length + (results.length === 1 ? ' result' : ' results');
    sInput.setAttribute('aria-activedescendant', 'sr-' + sel);
  }
  function runSearch() {
    if (!INDEX) return;
    const q = sInput.value.trim();
    if (!q) {
      results = INDEX.filter(e => e.k === 'page');
      sel = 0;
      render([], '');
      sStatus.textContent = 'All pages';
      return;
    }
    const r = rank(q);
    results = r.list;
    sel = 0;
    render(r.toks, 'Nothing matches <b>' + esc(q) + '</b>. Try a command such as <code>gh aw</code> or a feature such as <code>Autofix</code>.');
  }
  function select(i) {
    if (!results.length) return;
    sel = (i + results.length) % results.length;
    $$('[role="option"]', sList).forEach(li => li.setAttribute('aria-selected', String(li.id === 'sr-' + sel)));
    const li = $('#sr-' + sel, sList);
    if (li) li.scrollIntoView({ block: 'nearest' });
    sInput.setAttribute('aria-activedescendant', 'sr-' + sel);
  }
  function go(e) {
    if (!e) return;
    const [path, hash] = e.u.split('#');
    closeSearch(false);
    if (path === DATA.page && hash) {
      const t = document.getElementById(hash);
      if (t) { location.hash = hash; t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' }); return; }
    }
    location.href = e.u;
  }
  function openSearch() {
    if (!sModal) return;
    sReturn = document.activeElement;
    closeDrawer(false);
    sModal.hidden = false;
    requestAnimationFrame(() => sModal.classList.add('show'));
    body.classList.add('no-scroll');
    setInert(true);
    sInput.focus();
    sInput.select();
    loadIndex().then(() => runSearch());
  }
  function closeSearch(restore = true) {
    if (!sModal || sModal.hidden) return;
    sModal.classList.remove('show');
    sModal.hidden = true;
    body.classList.remove('no-scroll');
    setInert(false);
    if (restore && sReturn && sReturn.focus) sReturn.focus({ preventScroll: true });
  }
  if (sModal) {
    $$('[data-open-search]').forEach(b => b.addEventListener('click', openSearch));
    sModal.addEventListener('click', e => { if (e.target === sModal) closeSearch(); });
    $$('.search-close', sModal).forEach(b => b.addEventListener('click', () => closeSearch()));
    sInput.addEventListener('input', () => { if (INDEX) runSearch(); else loadIndex().then(runSearch); });
    sInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(results[sel]); }
    });
    sList.addEventListener('click', e => {
      const a = e.target.closest('a[data-i]');
      if (!a) return;
      e.preventDefault();
      go(results[+a.getAttribute('data-i')]);
    });
    sModal.addEventListener('keydown', e => trapTab($('.search-panel', sModal), e));
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    $$('.search-btn kbd').forEach(k => { k.textContent = mac ? '\u2318 K' : 'Ctrl K'; });
  }

  // ---------------------------------------------------------------- keyboard
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable);
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (sModal && !sModal.hidden) closeSearch(); else openSearch();
      return;
    }
    if (e.key === '/' && !typing && (!sModal || sModal.hidden) && (!lb || lb.hidden)) { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape') {
      if (lb && !lb.hidden) closeViewer();
      else if (sModal && !sModal.hidden) closeSearch();
      else closeDrawer();
      return;
    }
    if (lb && !lb.hidden) {
      if (e.key === 'ArrowRight') showImage(lbIndex + 1);
      else if (e.key === 'ArrowLeft') showImage(lbIndex - 1);
    }
  });

  renderProgress();
  onScroll();
})();
