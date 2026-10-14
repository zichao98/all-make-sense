// 把 decks/ 底下每一份簡報組成靜態網站，輸出到 dist/。
// 沒有任何 npm 相依套件：node build.mjs 就能跑。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DECKS = path.join(ROOT, 'decks');
const SITE = path.join(ROOT, 'site');
const DIST = path.join(ROOT, 'dist');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);

let warnings = 0;
const warn = (msg) => { warnings++; console.warn('  ! ' + msg); };

// 把一張投影片的 HTML 轉成瀏覽器能直接顯示的樣子
function transformSlide(html, assetIndex, deckSlug) {
  // /_blob/<id> → assets/<id>.<ext>
  html = html.replace(/(["'(])\/?_blob\/([0-9a-f]{32})/g, (m, pre, id) => {
    const file = assetIndex.get(id);
    if (!file) { warn(`${deckSlug}: 找不到素材 ${id}（請放到 assets/${id}.<副檔名>）`); return m; }
    return `${pre}assets/${file}`;
  });
  // <x-embed>…</x-embed> → 沙盒 iframe（srcdoc 由播放器在切到該頁時才載入）
  // 投影片整張會被縮放，canvas 用 2 倍解析度畫才不會糊
  const HIDPI = '<script>try{Object.defineProperty(window,"devicePixelRatio",{get:function(){return 2}})}catch(e){}</script>';
  html = html.replace(/<x-embed([^>]*)>([\s\S]*?)<\/x-embed>/g, (m, attrs, inner) => {
    inner = /<head>/i.test(inner) ? inner.replace(/<head>/i, '<head>' + HIDPI) : HIDPI + inner;
    return `<iframe class="x-embed"${attrs} sandbox="allow-scripts" title="動畫" data-srcdoc="${esc(inner)}"></iframe>`;
  });
  return html.trim();
}

function fontTags(faces) {
  const links = [], rules = [];
  for (const f of Object.values(faces || {})) {
    if (f.href) links.push(`<link rel="stylesheet" href="${esc(f.href)}">`);
    else if (f.src) rules.push(`@font-face{font-family:"${f.family}";src:url(${f.src});font-display:swap}`);
  }
  return { links, rules };
}

function loadDeck(slug) {
  const dir = path.join(DECKS, slug);
  const deck = readJson(path.join(dir, 'deck.json'), null);
  if (!deck) return null;
  const meta = readJson(path.join(dir, 'meta.json'), {});
  const assetDir = path.join(dir, 'assets');
  const assetIndex = new Map();
  if (fs.existsSync(assetDir)) {
    for (const f of fs.readdirSync(assetDir)) assetIndex.set(path.parse(f).name, f);
  }
  // 自己的字型檔（faces 的 src 是 /_blob/<id>）也改指到 assets/
  for (const face of Object.values(deck.faces || {})) {
    const m = face.src && face.src.match(/_blob\/([0-9a-f]{32})/);
    if (m && assetIndex.has(m[1])) face.src = 'assets/' + assetIndex.get(m[1]);
  }
  const slideDir = path.join(dir, 'slides');
  const files = fs.existsSync(slideDir) ? fs.readdirSync(slideDir).filter((f) => f.endsWith('.html')) : [];
  const ids = files.map((f) => f.slice(0, -5));
  const order = (deck.order || []).filter((id) => ids.includes(id)).concat(ids.filter((id) => !(deck.order || []).includes(id)));
  const slides = order
    .map((id) => ({ id, html: transformSlide(fs.readFileSync(path.join(slideDir, id + '.html'), 'utf8'), assetIndex, slug) }))
    .filter((s) => !/^<section[^>]*\shidden[\s>=]/.test(s.html));
  if (!slides.length) { warn(`${slug}: 沒有投影片`); return null; }
  const cover = slides.find((s) => s.id === deck.cover) || slides[0];
  return {
    slug, dir, deck, slides, cover,
    title: meta.title || deck.title || slug,
    subtitle: meta.subtitle || '',
    description: meta.description || '',
    date: meta.date || '',
    tags: meta.tags || [],
  };
}

function deckPage(d) {
  const { links, rules } = fontTags(d.deck.faces);
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description)}">
<link rel="icon" href="../site/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${links.join('\n')}
${rules.length ? `<style>${rules.join('')}</style>` : ''}
<link rel="stylesheet" href="../site/slide.css">
<link rel="stylesheet" href="../site/player.css">
</head>
<body>
<main class="stage" id="stage"><div class="slides deck" id="deck">
${d.slides.map((s) => s.html).join('\n')}
</div></main>
<header class="ui top" id="uiTop"><a class="back" href="../">← 所有簡報</a><span class="title">${esc(d.title)}</span></header>
<nav class="ui bottom" id="uiBottom" aria-label="簡報控制">
<button id="prev" aria-label="上一頁">‹</button><span id="count">1 / ${d.slides.length}</span><button id="next" aria-label="下一頁">›</button>
<button id="notesBtn" aria-pressed="false">備註</button><button id="fsBtn">全螢幕</button>
</nav>
<div class="progress" id="progress"></div>
<aside class="notes" id="notes" hidden></aside>
<div class="rotate-hint">轉成橫向看更清楚</div>
<script src="../site/player.js"></script>
</body>
</html>
`;
}

function indexPage(decks) {
  const faces = {};
  for (const d of decks) Object.assign(faces, d.deck.faces || {});
  const { links } = fontTags(faces);
  const cards = decks.map((d) => `<a class="card" href="${d.slug}/">
<div class="thumb"><div class="slides mini">${d.cover.html.replace(/src="assets\//g, `src="${d.slug}/assets/`)}</div></div>
<div class="info">
<h2>${esc(d.title)}</h2>
${d.subtitle ? `<p class="sub">${esc(d.subtitle)}</p>` : ''}
${d.description ? `<p class="desc">${esc(d.description)}</p>` : ''}
<p class="meta">${[d.date, d.slides.length + ' 頁', ...d.tags].filter(Boolean).map(esc).join(' · ')}</p>
</div></a>`).join('\n');
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>學習簡報</title>
<link rel="icon" href="site/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${links.join('\n')}
<link rel="stylesheet" href="site/slide.css">
<link rel="stylesheet" href="site/index.css">
</head>
<body>
<header class="head"><h1>學習簡報</h1><p>${decks.length} 份簡報 · 點進去用方向鍵、點擊或滑動翻頁</p></header>
<main class="grid">
${cards}
</main>
<script src="site/index.js"></script>
</body>
</html>
`;
}

// ---- build ----
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(SITE, path.join(DIST, 'site'), { recursive: true });

const decks = fs.readdirSync(DECKS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => loadDeck(e.name))
  .filter(Boolean)
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));

for (const d of decks) {
  const out = path.join(DIST, d.slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), deckPage(d));
  const assets = path.join(d.dir, 'assets');
  if (fs.existsSync(assets)) fs.cpSync(assets, path.join(out, 'assets'), { recursive: true });
  console.log(`✓ ${d.slug}  (${d.slides.length} 頁)`);
}
fs.writeFileSync(path.join(DIST, 'index.html'), indexPage(decks));
console.log(`完成：${decks.length} 份簡報 → dist/` + (warnings ? `，${warnings} 個警告` : ''));
if (warnings && process.env.STRICT) process.exit(1);
