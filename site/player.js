(function () {
  var deck = document.getElementById('deck');
  var stage = document.getElementById('stage');
  var reader = document.getElementById('reader');
  var slides = Array.prototype.filter.call(deck.children, function (e) { return e.tagName === 'SECTION'; });
  var count = document.getElementById('count');
  var notes = document.getElementById('notes');
  var notesBtn = document.getElementById('notesBtn');
  var progress = document.getElementById('progress');
  var readBtn = document.getElementById('readBtn');
  var zoomIn = document.getElementById('zoomIn');
  var zoomOut = document.getElementById('zoomOut');
  var zoomFit = document.getElementById('zoomFit');
  var cur = -1, reading = innerWidth <= 700 && innerHeight > innerWidth;
  var zoom = 1, base = 1, scale = 1, x = 0, y = 0, w = 0, h = 0, top = 0, available = 0;
  var timer, tapTimer, suppressClicksUntil = 0, touchInputUntil = 0;
  var figureObserver;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function paint() {
    var dw = 1920 * scale, dh = 1080 * scale;
    x = dw > w ? clamp(x, w - dw, 0) : (w - dw) / 2;
    y = dh > h ? clamp(y, h - dh, 0) : top + (available - dh) / 2;
    deck.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    document.body.classList.toggle('zoomed', zoom > 1);
    zoomFit.textContent = zoom === 1 ? 'Fit' : Math.round(zoom * 100) + '%';
    zoomFit.setAttribute('aria-label', 'Reset zoom to fit the whole slide');
    zoomIn.disabled = reading || zoom >= 4;
    zoomOut.disabled = reading || zoom <= 1;
    zoomFit.disabled = reading;
  }
  function fit() {
    var cx = scale ? (w / 2 - x) / scale : 960;
    var cy = scale ? (h / 2 - y) / scale : 540;
    w = innerWidth; h = innerHeight;
    var mobile = w <= 1000 || h <= 600;
    // Mobile controls float over the canvas and disappear when idle.
    top = mobile ? 4 : 68;
    var bottom = mobile ? 4 : 82;
    available = Math.max(1, h - top - bottom);
    base = Math.min(Math.max(1, w - (mobile ? 8 : 48)) / 1920, available / 1080);
    scale = base * zoom;
    x = zoom === 1 ? (w - 1920 * scale) / 2 : w / 2 - cx * scale;
    y = zoom === 1 ? top + (available - 1080 * scale) / 2 : h / 2 - cy * scale;
    paint();
  }
  function setZoom(value, ax, ay) {
    if (reading) return;
    ax = ax === undefined ? w / 2 : ax;
    ay = ay === undefined ? h / 2 : ay;
    var px = (ax - x) / scale, py = (ay - y) / scale;
    zoom = clamp(value, 1, 4); scale = base * zoom;
    x = ax - px * scale; y = ay - py * scale;
    paint(); wake();
  }
  function setEmbeds(sec, on) {
    sec.querySelectorAll('iframe[data-srcdoc]').forEach(function (f) {
      f.srcdoc = on ? f.getAttribute('data-srcdoc') : '';
    });
  }

  function showReader() {
    if (figureObserver) figureObserver.disconnect();
    reader.replaceChildren();
    if (!reading || cur < 0) return;
    var source = slides[cur], article = source.cloneNode(true);
    article.removeAttribute('id'); article.className = 'reader-slide';
    article.setAttribute('lang', deck.getAttribute('lang'));
    article.querySelectorAll('aside').forEach(function (e) { e.remove(); });
    article.querySelectorAll('iframe').forEach(function (old) {
      var fresh = document.createElement('iframe');
      Array.from(old.attributes).forEach(function (attr) {
        if (attr.name !== 'srcdoc') fresh.setAttribute(attr.name, attr.value);
      });
      old.replaceWith(fresh);
    });
    var children = Array.from(article.children), visual = [], frame;
    children.forEach(function (el) {
      if (el.style.position !== 'absolute') return;
      if (el.style.bottom) { el.remove(); return; }
      if (el.tagName === 'DIV') {
        frame = { left: parseFloat(el.style.left), top: parseFloat(el.style.top), width: parseFloat(el.style.width), height: parseFloat(el.style.height), background: el.style.background };
        el.remove();
      } else visual.push(el);
    });
    if (visual.length) {
      if (!frame) {
        var first = visual[0];
        frame = { left: parseFloat(first.style.left), top: parseFloat(first.style.top), width: parseFloat(first.style.width), height: parseFloat(first.style.height) };
      }
      var shell = document.createElement('div'); shell.className = 'reader-figure';
      shell.style.background = frame.background || source.style.background;
      var canvas = document.createElement('div'); canvas.className = 'figure-canvas';
      canvas.style.width = frame.width + 'px'; canvas.style.height = frame.height + 'px';
      visual.forEach(function (el) {
        el.style.left = (parseFloat(el.style.left) - frame.left) + 'px';
        el.style.top = (parseFloat(el.style.top) - frame.top) + 'px';
        canvas.appendChild(el);
      });
      shell.appendChild(canvas);
      var expand = document.createElement('button'); expand.className = 'expand-visual';
      expand.textContent = 'Enlarge visual ↗';
      expand.addEventListener('click', function () {
        setReading(false); zoom = 2.5; scale = base * zoom;
        x = w / 2 - (frame.left + frame.width / 2) * scale;
        y = h / 2 - (frame.top + frame.height / 2) * scale;
        paint(); wake();
      });
      shell.appendChild(expand); article.appendChild(shell);
      function sizeFigure() {
        var factor = shell.clientWidth / frame.width;
        if (window.CSS && CSS.supports('zoom', '1')) canvas.style.zoom = factor;
        else canvas.style.transform = 'scale(' + factor + ')';
        shell.style.height = (frame.height * factor + 42) + 'px';
      }
      if (window.ResizeObserver) { figureObserver = new ResizeObserver(sizeFigure); figureObserver.observe(shell); }
      else window.addEventListener('resize', sizeFigure, { once: true });
    }
    article.querySelectorAll('table').forEach(function (table) {
      var wrapper = document.createElement('div'); wrapper.className = 'reader-table';
      wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', 'Scrollable table');
      table.before(wrapper); wrapper.appendChild(table);
    });
    article.querySelectorAll('div').forEach(function (el) {
      if (el.closest('.reader-figure') || el.classList.contains('reader-table')) return;
      var items = Array.from(el.children);
      if (items.length > 1 && el.style.display === 'flex' && el.style.flexDirection !== 'column' && items.every(function (item) { return item.tagName === 'DIV' || item.tagName === 'X-SHAPE'; })) el.classList.add('reader-cards');
    });
    var textNodes = document.createTreeWalker(article, NodeFilter.SHOW_TEXT), node;
    while ((node = textNodes.nextNode())) {
      if (!node.parentElement.closest('.reader-figure')) node.textContent = node.textContent.replace(/On the right,/g, 'In the visual below,').replace(/右圖/g, '下圖');
    }
    reader.appendChild(article);
    // Give new iframe viewports their dimensions before starting canvas scripts.
    requestAnimationFrame(function () {
      if (reader.contains(article)) {
        article.getBoundingClientRect();
        setEmbeds(article, true);
      }
    });
  }
  function setReading(value) {
    clearTimeout(tapTimer); reading = value;
    stage.hidden = reading; reader.hidden = !reading;
    document.body.classList.toggle('reading', reading);
    document.documentElement.classList.toggle('reading', reading);
    readBtn.setAttribute('aria-pressed', String(reading));
    zoom = 1; fit();
    if (cur >= 0) { setEmbeds(slides[cur], !reading); showReader(); }
    window.scrollTo(0, 0); wake();
  }

  slides.forEach(function (s, i) {
    var seg = document.createElement('button'); seg.type = 'button';
    seg.title = 'Slide ' + (i + 1); seg.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    seg.addEventListener('click', function () { go(i); }); progress.appendChild(seg);
  });
  function go(n) {
    n = clamp(n, 0, slides.length - 1);
    if (n === cur) return;
    clearTimeout(tapTimer); lastTap = null;
    if (cur >= 0) { slides[cur].classList.remove('active'); setEmbeds(slides[cur], false); }
    cur = n; zoom = 1; fit();
    slides[cur].classList.add('active'); setEmbeds(slides[cur], !reading);
    showReader(); if (reading) window.scrollTo(0, 0);
    count.textContent = (cur + 1) + ' / ' + slides.length;
    document.getElementById('prev').disabled = cur === 0;
    document.getElementById('next').disabled = cur === slides.length - 1;
    Array.from(progress.children).forEach(function (seg, i) {
      seg.classList.toggle('done', i <= cur);
      if (i === cur) seg.setAttribute('aria-current', 'step'); else seg.removeAttribute('aria-current');
    });
    var aside = slides[cur].querySelector('aside');
    notes.textContent = aside ? aside.textContent.trim() : 'No speaker notes for this slide.';
    if (history.replaceState) history.replaceState(null, '', '#' + (cur + 1));
  }
  function toggleNotes() {
    notes.hidden = !notes.hidden; notesBtn.setAttribute('aria-pressed', String(!notes.hidden)); wake();
  }
  function toggleFs() {
    var d = document, el = d.documentElement, result;
    if (d.fullscreenElement || d.webkitFullscreenElement) result = (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen) result = el.requestFullscreen();
    else if (el.webkitRequestFullscreen) result = el.webkitRequestFullscreen();
    if (result && result.catch) result.catch(function () { wake(); });
  }
  document.getElementById('prev').addEventListener('click', function () { go(cur - 1); });
  document.getElementById('next').addEventListener('click', function () { go(cur + 1); });
  notesBtn.addEventListener('click', toggleNotes);
  document.getElementById('fsBtn').addEventListener('click', toggleFs);
  readBtn.addEventListener('click', function () { setReading(!reading); });
  zoomIn.addEventListener('click', function () { setZoom(zoom + 0.5); });
  zoomOut.addEventListener('click', function () { setZoom(zoom - 0.5); });
  zoomFit.addEventListener('click', function () { setZoom(1); });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    var k = e.key;
    if ((k === 'Enter' || k === ' ') && e.target.closest('button,a')) return;
    if (k === 'ArrowRight' || k === 'PageDown' || (!reading && (k === 'ArrowDown' || k === ' ' || k === 'Enter'))) { go(cur + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || (!reading && k === 'ArrowUp') || k === 'Backspace') { go(cur - 1); e.preventDefault(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'r' || k === 'R') setReading(!reading);
    else if (k === '+' || k === '=') setZoom(zoom + 0.5);
    else if (k === '-' || k === '_') setZoom(zoom - 0.5);
    else if (k === '0') setZoom(1);
    else if (k === 'Escape') { if (!notes.hidden) toggleNotes(); else if (zoom > 1) setZoom(1); }
  });

  stage.addEventListener('click', function (e) {
    if (Date.now() < suppressClicksUntil || zoom > 1) return;
    clearTimeout(tapTimer);
    if (e.detail < 2) tapTimer = setTimeout(function () { go(e.clientX < w * 0.3 ? cur - 1 : cur + 1); }, 280);
  });
  stage.addEventListener('dblclick', function (e) {
    e.preventDefault(); clearTimeout(tapTimer);
    if (Date.now() < touchInputUntil) return;
    setZoom(zoom > 1 ? 1 : 2.5, e.clientX, e.clientY);
  });
  var drag;
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || zoom === 1) return;
    drag = { px: e.clientX, py: e.clientY, x: x, y: y };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; paint();
    suppressClicksUntil = Date.now() + 500;
  });
  function endDrag() { drag = null; }
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);

  var gesture, lastTap;
  function distance(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  stage.addEventListener('touchstart', function (e) {
    clearTimeout(tapTimer); suppressClicksUntil = touchInputUntil = Date.now() + 800;
    var a = e.touches[0];
    if (e.touches.length >= 2) {
      var b = e.touches[1], mx = (a.clientX + b.clientX) / 2, my = (a.clientY + b.clientY) / 2;
      gesture = { mode: 'pinch', distance: distance(a, b), zoom: zoom, px: (mx - x) / scale, py: (my - y) / scale };
    } else gesture = { mode: zoom > 1 ? 'pan' : 'swipe', px: a.clientX, py: a.clientY, x: x, y: y, moved: false };
  }, { passive: true });
  stage.addEventListener('touchmove', function (e) {
    if (!gesture) return;
    var a = e.touches[0];
    if (gesture.mode === 'pinch' && e.touches.length >= 2) {
      e.preventDefault(); var b = e.touches[1];
      zoom = clamp(gesture.zoom * distance(a, b) / Math.max(1, gesture.distance), 1, 4); scale = base * zoom;
      x = (a.clientX + b.clientX) / 2 - gesture.px * scale;
      y = (a.clientY + b.clientY) / 2 - gesture.py * scale; paint();
    } else if (gesture.mode === 'pan') {
      e.preventDefault(); x = gesture.x + a.clientX - gesture.px; y = gesture.y + a.clientY - gesture.py; paint();
      gesture.moved = gesture.moved || Math.hypot(a.clientX - gesture.px, a.clientY - gesture.py) > 8;
    } else if (gesture.mode === 'swipe') gesture.moved = gesture.moved || Math.hypot(a.clientX - gesture.px, a.clientY - gesture.py) > 8;
  }, { passive: false });
  stage.addEventListener('touchend', function (e) {
    if (!gesture) return;
    suppressClicksUntil = touchInputUntil = Date.now() + 600;
    if (gesture.mode === 'pinch') {
      if (e.touches.length === 1) {
        var remaining = e.touches[0];
        gesture = { mode: 'pan', px: remaining.clientX, py: remaining.clientY, x: x, y: y, moved: true };
      } else gesture = null;
      lastTap = null; return;
    }
    if (e.touches.length) return;
    var a = e.changedTouches[0], dx = a.clientX - gesture.px, dy = a.clientY - gesture.py;
    if (gesture.mode === 'swipe' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? cur + 1 : cur - 1); lastTap = null; }
    else if (!gesture.moved) {
      var now = Date.now();
      if (lastTap && now - lastTap.time < 320 && Math.hypot(a.clientX - lastTap.x, a.clientY - lastTap.y) < 40) {
        clearTimeout(tapTimer); setZoom(zoom > 1 ? 1 : 2.5, a.clientX, a.clientY); lastTap = null;
      } else {
        lastTap = { time: now, x: a.clientX, y: a.clientY };
        if (zoom === 1) tapTimer = setTimeout(function () { go(a.clientX < w * 0.3 ? cur - 1 : cur + 1); lastTap = null; }, 320);
      }
    }
    gesture = null;
  });
  stage.addEventListener('touchcancel', function () { gesture = null; lastTap = null; clearTimeout(tapTimer); suppressClicksUntil = touchInputUntil = Date.now() + 600; });
  stage.addEventListener('wheel', function (e) {
    if (e.ctrlKey) { e.preventDefault(); setZoom(zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY); }
  }, { passive: false });

  function wake() {
    document.body.classList.remove('idle'); clearTimeout(timer);
    timer = setTimeout(function () { if (!reading && !document.querySelector('.ui:focus-within') && notes.hidden) document.body.classList.add('idle'); }, 2500);
  }
  ['mousemove', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
  window.addEventListener('resize', fit);
  window.addEventListener('fullscreenchange', fit);
  window.addEventListener('hashchange', function () { go((parseInt(location.hash.slice(1), 10) || 1) - 1); });
  setReading(reading);
  go((parseInt(location.hash.slice(1), 10) || 1) - 1);
  wake();
})();
