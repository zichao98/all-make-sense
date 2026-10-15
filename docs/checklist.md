# 交付前檢查清單

## 內容

- [ ] 第一頁之後很快就有「把難問題換成好想像的問題」的那一頁
- [ ] 有一條能估算的公式，也有一個不用算的眼估法
- [ ] 至少一組「三例對比」，其中一個反直覺
- [ ] 理論之後有「實際跑跑看」，並說明兩者的差距
- [ ] 每個數字都算過（腳本結果有對到投影片上的數字）
- [ ] 經驗值標明是經驗值；適用條件（例如「一維輸入、一層」）寫在頁尾或備註
- [ ] 沒有捏造的統計、引用、研究
- [ ] 最後一頁「一頁帶走」，備註回答使用者最初的問題
- [ ] 每頁都有 `<aside>` 講者備註

## 格式

- [ ] `node build.mjs --all --strict` 沒有警告
- [ ] 每個 slides 檔只有一個 `<section>`，`id` 等於檔名，也在 `deck.json` 的 `order` 裡
- [ ] 所有樣式都是 inline；沒有 class、`<style>`、`<script>`（腳本只在 `x-embed` 裡）
- [ ] 所有字 ≥ 24px
- [ ] 公式都是 `assets/*.svg`，寬高照 `tex2svg.mjs` 的輸出
- [ ] 每個 `img` 有 `alt`；每個內嵌 `svg` 有 `aria-label`
- [ ] 內容不超過 y = 920（有頁尾時）；左欄文字不撞到右邊的動畫卡（x 880 起）
- [ ] eyebrow 編號與頁尾頁碼連續
- [ ] 每個 `x-embed` ≤ 16 KB，JS 裡沒有 `<` 和 `&`

## 預覽

- [ ] `python -m http.server 8788 --directory dist`，打開 `http://localhost:8788/<slug>/`
- [ ] 每一頁都看過；有動畫的頁面至少看一輪循環
- [ ] 首頁卡片的封面縮圖正常、標題和說明正確（`meta.json`）
- [ ] 手機橫放也能看（瀏覽器開發者工具切到 844×390）

## 發佈

- [ ] `git add -A && git commit && git push`
- [ ] `node build.mjs && npx wrangler deploy`（在使用者的電腦上要用 `env -u CLOUDFLARE_API_TOKEN`）
- [ ] 線上網址的首頁、`/<slug>/`、一個 `assets/` 檔案都回 200
- [ ] 把網址 `https://all-make-sense.zichaoleng55.workers.dev/<slug>/` 給使用者
