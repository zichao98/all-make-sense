(function () {
  var deck = document.getElementById('deck');
  var slides = Array.prototype.filter.call(deck.children, function (e) { return e.tagName === 'SECTION'; });
  var count = document.getElementById('count');
  var notes = document.getElementById('notes');
  var notesBtn = document.getElementById('notesBtn');
  var progress = document.getElementById('progress');
  var cur = -1;

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    var compact = h <= 600, top = compact ? 44 : 68, bottom = compact ? 52 : 82;
    var available = Math.max(1, h - top - bottom);
    var s = Math.min(Math.max(1, w - (compact ? 24 : 48)) / 1920, available / 1080);
    deck.style.transform = 'translate(' + (w - 1920 * s) / 2 + 'px,' + (top + (available - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }

  // 動畫只在目前這頁執行；離開就卸載，回來時從頭播放
  function setEmbeds(sec, on) {
    sec.querySelectorAll('iframe[data-srcdoc]').forEach(function (f) {
      f.srcdoc = on ? f.getAttribute('data-srcdoc') : '';
    });
  }

  slides.forEach(function (s, i) {
    var seg = document.createElement('button');
    seg.type = 'button';
    seg.title = 'Slide ' + (i + 1);
    seg.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    seg.addEventListener('click', function (e) { e.stopPropagation(); go(i); });
    progress.appendChild(seg);
  });

  function go(n) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === cur) return;
    if (cur >= 0) { slides[cur].classList.remove('active'); setEmbeds(slides[cur], false); }
    cur = n;
    slides[cur].classList.add('active');
    setEmbeds(slides[cur], true);
    count.textContent = (cur + 1) + ' / ' + slides.length;
    document.getElementById('prev').disabled = cur === 0;
    document.getElementById('next').disabled = cur === slides.length - 1;
    Array.prototype.forEach.call(progress.children, function (seg, i) { seg.classList.toggle('done', i <= cur); if (i === cur) seg.setAttribute('aria-current', 'step'); else seg.removeAttribute('aria-current'); });
    var aside = slides[cur].querySelector('aside');
    notes.textContent = aside ? aside.textContent.trim() : 'No speaker notes for this slide.';
    if (history.replaceState) history.replaceState(null, '', '#' + (cur + 1));
  }

  function toggleNotes() {
    notes.hidden = !notes.hidden;
    notesBtn.setAttribute('aria-pressed', String(!notes.hidden));
  }
  function toggleFs() {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  document.getElementById('prev').addEventListener('click', function () { go(cur - 1); });
  document.getElementById('next').addEventListener('click', function () { go(cur + 1); });
  notesBtn.addEventListener('click', toggleNotes);
  document.getElementById('fsBtn').addEventListener('click', toggleFs);

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if ((k === 'Enter' || k === ' ') && e.target.closest('button,a,input,textarea,select')) return;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { go(cur + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { go(cur - 1); e.preventDefault(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'Escape' && !notes.hidden) toggleNotes();
  });

  // 點畫面左邊 30% 往回，其餘往前；手機左右滑動翻頁
  var stage = document.getElementById('stage'), sx = null, sy = null, swiped = false;
  stage.addEventListener('click', function (e) {
    if (swiped) { swiped = false; return; }
    go(e.clientX < window.innerWidth * 0.3 ? cur - 1 : cur + 1);
  });
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(dx < 0 ? cur + 1 : cur - 1); }
    sx = null;
  });

  // 控制列閒置時自動隱藏
  var timer;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(timer);
    timer = setTimeout(function () { if (!document.querySelector('.ui:focus-within') && notes.hidden) document.body.classList.add('idle'); }, 2500);
  }
  ['mousemove', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function () { go((parseInt(location.hash.slice(1), 10) || 1) - 1); });
  fit();
  go((parseInt(location.hash.slice(1), 10) || 1) - 1);
  wake();
})();
