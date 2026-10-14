// 把每張卡片的封面（1920×1080）縮放到卡片寬度，並啟動封面上的動畫
document.querySelectorAll('.thumb').forEach(function (thumb) {
  var mini = thumb.querySelector('.mini');
  var fit = function () { mini.style.transform = 'scale(' + thumb.clientWidth / 1920 + ')'; };
  if (window.ResizeObserver) new ResizeObserver(fit).observe(thumb);
  window.addEventListener('resize', fit);
  fit();
  mini.querySelectorAll('iframe[data-srcdoc]').forEach(function (f) { f.srcdoc = f.getAttribute('data-srcdoc'); });
});
