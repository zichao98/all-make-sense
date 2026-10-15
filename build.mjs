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
  // 直接寫 assets/<檔名> 的圖片要真的存在
  for (const [, file] of html.matchAll(/src="assets\/([^"]+)"/g)) {
    if (!assetIndex.has(path.parse(file).name)) warn(`${deckSlug}: 找不到素材 assets/${file}`);
  }
  // <x-embed>…</x-embed> → 沙盒 iframe（srcdoc 由播放器在切到該頁時才載入）
  // 投影片整張會被縮放，canvas 用 2 倍解析度畫才不會糊
  const HIDPI = '<script>try{Object.defineProperty(window,"devicePixelRatio",{get:function(){return 2}})}catch(e){}</script>';
  html = html.replace(/<x-embed([^>]*)>([\s\S]*?)<\/x-embed>/g, (m, attrs, inner) => {
    const kb = Buffer.byteLength(inner) / 1024;
    if (kb > 16) warn(`${deckSlug}: 有一個 x-embed ${kb.toFixed(1)} KB，超過 16 KB（Claude Slides 的上限）`);
    inner = /<head>/i.test(inner) ? inner.replace(/<head>/i, '<head>' + HIDPI) : HIDPI + inner;
    return `<iframe class="x-embed"${attrs} sandbox="allow-scripts" title="Animation" tabindex="-1" data-srcdoc="${esc(inner)}"></iframe>`;
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
  for (const id of deck.order || []) if (!ids.includes(id)) warn(`${slug}: deck.json 的 order 有 "${id}"，但沒有 slides/${id}.html`);
  const slides = order
    .map((id) => {
      const raw = fs.readFileSync(path.join(slideDir, id + '.html'), 'utf8');
      const sid = (raw.match(/<section[^>]*\sid="([^"]+)"/) || [])[1];
      if (sid !== id) warn(`${slug}: slides/${id}.html 的 <section id> 是 "${sid}"，要跟檔名一樣`);
      return { id, html: transformSlide(raw, assetIndex, slug) };
    })
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
  const uiTitle = d.slug === 'deep-learning-intuition' ? 'Deep Learning Intuition · Chinese edition' : d.slug === '_template' ? 'The slide toolkit' : d.title;
  const { links, rules } = fontTags(d.deck.faces);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(uiTitle)} — All Make Sense</title>
<meta name="description" content="${esc(d.description)}">
<link rel="icon" href="../site/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${links.join('\n')}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&display=swap">
${rules.length ? `<style>${rules.join('')}</style>` : ''}
<link rel="stylesheet" href="../site/slide.css">
<link rel="stylesheet" href="../site/player.css">
</head>
<body>
<main class="stage" id="stage"><div class="slides deck" id="deck" lang="${/[\u4e00-\u9fff]/.test(d.title) ? 'zh-Hant' : 'en'}">
${d.slides.map((s) => s.html).join('\n')}
</div></main>
<header class="ui top" id="uiTop"><a class="back" href="../">← Collection</a><span class="title">${esc(uiTitle)}</span></header>
<nav class="ui bottom" id="uiBottom" aria-label="Presentation controls">
<button id="prev" aria-label="Previous slide" title="Previous slide (←)">‹</button><span id="count">1 / ${d.slides.length}</span><button id="next" aria-label="Next slide" title="Next slide (→)">›</button>
<button id="notesBtn" aria-pressed="false" title="Speaker notes (N)">Notes</button><button id="fsBtn" title="Fullscreen (F)">Fullscreen</button>
</nav>
<div class="progress" id="progress"></div>
<aside class="notes" id="notes" aria-label="Speaker notes" hidden></aside>
<div class="rotate-hint">Rotate your device for the full picture.</div>
<script src="../site/player.js"></script>
</body>
</html>
`;
}

function indexPage(decks) {
  const faces = {};
  for (const d of decks) Object.assign(faces, d.deck.faces || {});
  const { links } = fontTags(faces);
  // Prefer the English edition while keeping each original edition accessible.
  const catalog = decks.filter((d) => !decks.some((other) => other.slug === d.slug + '-en'));
  const cards = catalog.map((d, i) => {
    const original = d.slug.endsWith('-en') ? decks.find((other) => other.slug === d.slug.slice(0, -3)) : null;
    const template = d.slug === '_template';
    const title = template ? 'The slide toolkit' : d.title;
    const subtitle = template ? 'Layouts, formulas, and live animations' : d.subtitle;
    const description = template ? 'Explore the building blocks behind every lesson, from visual explanations to animations that do the math.' : d.description;
    const tags = template ? ['Design', 'Templates'] : d.tags;
    return `<article class="card${i === 0 ? ' featured' : ''}">
<a class="cover-link" href="${d.slug}/" aria-label="Open ${esc(title)}">
<div class="thumb"><div class="slides mini" aria-hidden="true">${d.cover.html.replace(/src="assets\//g, `src="${d.slug}/assets/`)}</div></div>
<span class="cover-action">Explore the lesson <span aria-hidden="true">↗</span></span>
</a>
<div class="info">
<div class="card-kicker"><span>LESSON ${String(i + 1).padStart(2, '0')}</span><span>${d.slides.length} slides</span></div>
<h3><a href="${d.slug}/">${esc(title)}</a></h3>
${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}
${description ? `<p class="desc">${esc(description)}</p>` : ''}
<div class="tags">${tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>
<div class="editions"><a class="read-link" href="${d.slug}/">Start exploring <span aria-hidden="true">↗</span></a>${original ? `<a class="edition-link" href="${original.slug}/" lang="en">Chinese edition ↗</a>` : ''}</div>
</div></article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Visual lessons for curious minds. Explore deep learning, mathematics, and the ideas behind them through interactive presentations.">
<meta name="theme-color" content="#F7F5F0">
<title>All Make Sense — Visual lessons for curious minds</title>
<link rel="icon" href="site/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${links.join('\n')}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="site/slide.css">
<link rel="stylesheet" href="site/index.css">
</head>
<body>
<a class="skip-link" href="#collection">Skip to the collection</a>
<header class="site-header wrap">
<a class="brand" href="./" aria-label="All Make Sense home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>ALL MAKE SENSE<span class="brand-dot">.</span></a>
<nav aria-label="Main navigation"><a href="#collection">The collection</a><a href="#guide">How to explore <span aria-hidden="true">↗</span></a></nav>
</header>
<main>
<section class="hero wrap" aria-labelledby="hero-title">
<p class="eyebrow"><span></span> VISUAL LESSONS FOR CURIOUS MINDS</p>
<h1 id="hero-title">Make the complex<br><em>make sense.</em></h1>
<div class="hero-bottom"><p>Ideas become clearer when you can see them.<br> Explore lessons that move, connect, and bring the intuition to life.</p><a class="hero-link" href="#collection">Find your next insight <span aria-hidden="true">↓</span></a></div>
</section>
<section class="collection wrap" id="collection" aria-labelledby="collection-title">
<div class="section-heading"><div><p class="eyebrow">THE COLLECTION</p><h2 id="collection-title">A closer look.</h2></div><p>${catalog.length} ${catalog.length === 1 ? 'lesson' : 'lessons'} <span>/</span> Made to be explored</p></div>
<div class="grid">${cards}</div>
</section>
<section class="guide wrap" id="guide" aria-labelledby="guide-title">
<div class="guide-intro"><p class="eyebrow">SET YOUR OWN PACE</p><h2 id="guide-title">Less scrolling.<br>More understanding.</h2></div>
<div class="guide-items"><div><span class="guide-number">01</span><h3>Follow the idea</h3><p>Use the arrow keys, tap, or swipe to move through each lesson.</p></div><div><span class="guide-number">02</span><h3>Watch it unfold</h3><p>Let the animations play. They're working through the idea in real time.</p></div><div><span class="guide-number">03</span><h3>Go a little deeper</h3><p>Open Notes for the explanation behind each slide. Press F for fullscreen.</p></div></div>
</section>
</main>
<footer class="site-footer wrap"><a class="brand" href="./">ALL MAKE SENSE<span class="brand-dot">.</span></a><p>Small lessons. Lasting intuition.</p><a href="#hero-title">Back to top ↑</a></footer>
<script src="site/index.js"></script>
</body>
</html>
`;
}

// ---- build ----
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(SITE, path.join(DIST, 'site'), { recursive: true });

// 名稱以 _ 開頭的資料夾（例如 _template）是草稿，只有 --all 時才放進網站
const ALL = process.argv.includes('--all');
const decks = fs.readdirSync(DECKS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && (ALL || !e.name.startsWith('_')))
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
if (warnings && (process.env.STRICT || process.argv.includes('--strict'))) process.exit(1);
