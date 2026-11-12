(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('.frame'));
  var stage = document.getElementById('stage');
  var count = document.getElementById('count');
  var progress = document.getElementById('progress');
  var notesText = document.getElementById('notes-text');
  var btnOverview = document.getElementById('btn-overview');
  var btnNotes = document.getElementById('btn-notes');
  var i = 0;

  function fit() {
    var s = Math.min(stage.clientWidth / 1280, stage.clientHeight / 720) * 0.96;
    document.documentElement.style.setProperty('--s', s > 0 ? s : 1);
  }

  function show(n) {
    i = Math.max(0, Math.min(frames.length - 1, n));
    frames.forEach(function (f, k) { f.classList.toggle('active', k === i); });
    count.textContent = (i + 1) + ' / ' + frames.length;
    progress.style.width = ((i + 1) / frames.length * 100) + '%';
    var sn = frames[i].querySelector('.sn');
    notesText.textContent = sn ? sn.textContent : '';
    var h = '#' + (i + 1);
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  function toggleOverview(force) {
    var on = typeof force === 'boolean' ? force : !document.body.classList.contains('overview');
    document.body.classList.toggle('overview', on);
    btnOverview.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) fit();
    if (on) frames[i].scrollIntoView({ block: 'center' });
  }

  function toggleNotes() {
    var on = !document.body.classList.contains('notes-open');
    document.body.classList.toggle('notes-open', on);
    btnNotes.setAttribute('aria-pressed', on ? 'true' : 'false');
    fit();
  }

  function fullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  }

  frames.forEach(function (f, k) {
    f.addEventListener('click', function () {
      if (document.body.classList.contains('overview')) { show(k); toggleOverview(false); }
    });
  });
  document.getElementById('prev').addEventListener('click', function () { show(i - 1); });
  document.getElementById('next').addEventListener('click', function () { show(i + 1); });
  btnOverview.addEventListener('click', function () { toggleOverview(); });
  btnNotes.addEventListener('click', toggleNotes);
  document.getElementById('btn-full').addEventListener('click', fullscreen);
  document.getElementById('btn-pdf').addEventListener('click', function () { window.print(); });

  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var k = ev.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { ev.preventDefault(); show(i + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { ev.preventDefault(); show(i - 1); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(frames.length - 1);
    else if (k === 'o' || k === 'O') toggleOverview();
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 'p' || k === 'P') window.print();
    else if (k === 'Escape' && document.body.classList.contains('overview')) toggleOverview(false);
  });

  var x0 = null;
  stage.addEventListener('touchstart', function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (ev) {
    if (x0 === null) return;
    var dx = ev.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function () {
    var n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n)) show(n - 1);
  });
  var start = parseInt(location.hash.slice(1), 10);
  fit();
  show(isNaN(start) ? 0 : start - 1);
})();
