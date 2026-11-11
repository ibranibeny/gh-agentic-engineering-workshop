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

  // Copy buttons on code blocks
  document.querySelectorAll('pre').forEach(function (pre) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'copy-btn';
    b.textContent = 'Copy';
    b.addEventListener('click', function () {
      var text = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
      navigator.clipboard.writeText(text).then(function () {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy'; }, 1500);
      });
    });
    pre.appendChild(b);
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
