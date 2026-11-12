(function () {
  var KEY = 'contoso-workshop-devmode';
  var body = document.body;
  var sw = document.getElementById('devswitch');
  var params = new URLSearchParams(location.search);
  var on = params.get('mode') === 'dev' || (params.get('mode') !== 'story' && localStorage.getItem(KEY) === '1');
  function apply(v) {
    body.classList.toggle('devmode', v);
    if (sw) sw.setAttribute('aria-checked', v ? 'true' : 'false');
  }
  apply(on);
  if (sw) {
    sw.addEventListener('click', function () {
      on = !on;
      localStorage.setItem(KEY, on ? '1' : '0');
      apply(on);
    });
  }

  // Copy buttons: command blocks get a labelled button in their header, other code blocks a corner button
  function legacyCopy(text) {
    var active = document.activeElement;
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    if (active && active.focus) { active.focus(); }
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        if (!legacyCopy(text)) { throw new Error('copy failed'); }
      });
    }
    return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }
  document.querySelectorAll('pre').forEach(function (pre) {
    var block = pre.closest('.cmd');
    var src = pre.querySelector('code') || pre;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'copy-btn';
    b.textContent = 'Copy';
    b.setAttribute('aria-live', 'polite');
    b.setAttribute('title', block ? 'Copy: ' + block.getAttribute('data-label') : 'Copy code');
    b.addEventListener('click', function () {
      var text = src.textContent.replace(/\s+$/, '');
      copyText(text).then(function () {
        b.textContent = 'Copied';
        b.classList.add('ok');
        setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('ok'); }, 1600);
      }, function () {
        var r = document.createRange();
        r.selectNodeContents(src);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        b.textContent = 'Press Ctrl+C';
        setTimeout(function () { b.textContent = 'Copy'; }, 2500);
      });
    });
    if (block) { block.querySelector('.cmd-head').appendChild(b); } else { pre.appendChild(b); }
  });

  // Lightbox for screenshots
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt="">';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('img');
  document.querySelectorAll('.shot .frame').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var img = a.querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lb.classList.add('open');
    });
  });
  lb.addEventListener('click', function () { lb.classList.remove('open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('open'); });

  // Highlight the current section in the sidebar
  var links = Array.prototype.slice.call(document.querySelectorAll('.side a[href^="#"]'));
  if ('IntersectionObserver' in window && links.length) {
    var map = {};
    links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (l) { l.classList.remove('on'); });
          map[en.target.id].classList.add('on');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
})();
