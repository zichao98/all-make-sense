// 從 decks/_template 複製出一份新簡報的骨架。
//
//   node tools/new-deck.mjs <slug> "<標題>"
//
// 會建立 decks/<slug>/：deck.json（只有封面）、meta.json、formulas.txt、slides/cover.html。
// 其他版型請從 decks/_template/slides/ 挑來複製、改內容。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, title] = process.argv.slice(2);
if (!slug || !title || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('用法：node tools/new-deck.mjs <slug> "<標題>"   （slug 用小寫英數和 -）');
  process.exit(1);
}
const tpl = path.join(ROOT, 'decks', '_template');
const dir = path.join(ROOT, 'decks', slug);
if (fs.existsSync(dir)) { console.error(`decks/${slug} 已經存在`); process.exit(1); }

fs.mkdirSync(path.join(dir, 'slides'), { recursive: true });
fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });

const deck = JSON.parse(fs.readFileSync(path.join(tpl, 'deck.json'), 'utf8'));
deck.title = title;
deck.createdOnFiles = { v: 1, at: new Date().toISOString() };
deck.order = ['cover'];
deck.cover = 'cover';
deck.sections = { s1: { description: '開場', start: 'cover' } };
fs.writeFileSync(path.join(dir, 'deck.json'), JSON.stringify(deck, null, 2) + '\n');

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
  title, subtitle: '', description: '', date: today, tags: [],
}, null, 2) + '\n');

fs.writeFileSync(path.join(dir, 'formulas.txt'),
  '// 名稱   顏色     字級(px)   LaTeX（照寫，不用跳脫反斜線）\n// 例：relu   #17212B  42  y = \\max(0,\\; w x + b)\n');

const cover = fs.readFileSync(path.join(tpl, 'slides', 'cover.html'), 'utf8');
fs.writeFileSync(path.join(dir, 'slides', 'cover.html'), cover);

console.log(`已建立 decks/${slug}/。下一步：改 slides/cover.html，從 decks/_template/slides/ 複製需要的版型，並把 id 加進 deck.json 的 order。`);
