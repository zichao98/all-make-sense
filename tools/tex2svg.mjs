// 把 decks/<slug>/formulas.txt 裡的 LaTeX 公式轉成 SVG，放到 decks/<slug>/assets/<名稱>.svg。
//
//   npm install            （第一次，裝 mathjax-full）
//   node tools/tex2svg.mjs <slug>
//
// formulas.txt 每行一個公式，欄位用空白隔開：
//   名稱   顏色     字級(px)   LaTeX
//   relu   #17212B  42        y = \max(0,\; w x + b)
// 以 // 開頭的行是註解。LaTeX 照寫，不用跳脫反斜線。
// 輸出的 SVG 已經寫好 px 寬高；腳本會印出每個公式的寬高，並存到 assets/formulas.json，
// 投影片裡用 <img src="assets/relu.svg" style="width:寬px;height:高px;object-fit:contain">。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let mj;
try {
  mj = {
    mathjax: require('mathjax-full/js/mathjax.js').mathjax,
    TeX: require('mathjax-full/js/input/tex.js').TeX,
    SVG: require('mathjax-full/js/output/svg.js').SVG,
    liteAdaptor: require('mathjax-full/js/adaptors/liteAdaptor.js').liteAdaptor,
    RegisterHTMLHandler: require('mathjax-full/js/handlers/html.js').RegisterHTMLHandler,
    AllPackages: require('mathjax-full/js/input/tex/AllPackages.js').AllPackages,
  };
} catch {
  console.error('找不到 mathjax-full，請先在 repo 根目錄執行 npm install');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) { console.error('用法：node tools/tex2svg.mjs <slug>'); process.exit(1); }
const deckDir = path.join(ROOT, 'decks', slug);
const src = path.join(deckDir, 'formulas.txt');
if (!fs.existsSync(src)) { console.error(`找不到 ${path.relative(ROOT, src)}`); process.exit(1); }

const adaptor = mj.liteAdaptor();
mj.RegisterHTMLHandler(adaptor);
const doc = mj.mathjax.document('', {
  InputJax: new mj.TeX({ packages: mj.AllPackages }),
  OutputJax: new mj.SVG({ fontCache: 'none' }), // 路徑直接內嵌，不用 <use>，也不需要字型
});

const outDir = path.join(deckDir, 'assets');
fs.mkdirSync(outDir, { recursive: true });
const dimsFile = path.join(outDir, 'formulas.json');
const dims = fs.existsSync(dimsFile) ? JSON.parse(fs.readFileSync(dimsFile, 'utf8')) : {};
let failed = 0;

for (const [n, rawLine] of fs.readFileSync(src, 'utf8').split(/\r?\n/).entries()) {
  const line = rawLine.trim();
  if (!line || line.startsWith('//')) continue;
  const m = line.match(/^(\S+)\s+(#[0-9a-fA-F]{3,8})\s+(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!m) { console.error(`第 ${n + 1} 行格式不對：${line}`); failed++; continue; }
  const [, name, color, sizeStr, tex] = m;
  if (!/^[A-Za-z0-9_-]+$/.test(name)) { console.error(`第 ${n + 1} 行：名稱只能用英數、_、-`); failed++; continue; }
  const size = Number(sizeStr);
  const node = doc.convert(tex, { display: true });
  let svg = adaptor.outerHTML(adaptor.firstChild(node));
  if (/data-mjx-error|merror/.test(svg)) { console.error(`第 ${n + 1} 行 LaTeX 有錯：${tex}`); failed++; continue; }
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/);
  const w = Math.ceil((+vb[3] / 1000) * size), h = Math.ceil((+vb[4] / 1000) * size);
  svg = svg
    .replace(/ style="[^"]*"/, '')
    .replace(/ width="[^"]*"/, ` width="${w}"`)
    .replace(/ height="[^"]*"/, ` height="${h}"`)
    .replace(/ role="img"| focusable="false"| aria-hidden="true"/g, '')
    .replace(/currentColor/g, color);
  fs.writeFileSync(path.join(outDir, name + '.svg'), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg + '\n');
  dims[name] = { width: w, height: h, tex };
  console.log(`${name.padEnd(16)} ${String(w).padStart(4)} × ${String(h).padEnd(4)} <img src="assets/${name}.svg" alt="" style="width:${w}px;height:${h}px;object-fit:contain">`);
}
fs.writeFileSync(dimsFile, JSON.stringify(dims, null, 2) + '\n');
if (failed) process.exit(1);
