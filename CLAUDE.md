# learning-decks

使用者跟 Claude 做的學習用投影片（Claude Slides artifact）都收在這裡，部署到 Cloudflare 當成可以隨時看的合集網站。使用者用繁體中文溝通。

## 新增或更新一份簡報

1. 簡報先在 claude.ai 做成 Slides artifact（`project/deck.json` + `project/slides/<id>.html`）。
2. 用 Artifact `read` 搭配 `paths`，把 `project/deck.json` 和 `order` 裡每一張 `project/slides/<id>.html` 讀下來，複製到 `decks/<slug>/deck.json` 與 `decks/<slug>/slides/`。`<slug>` 用英文小寫加連字號。
3. 素材：在投影片裡 grep `/_blob/<32 位 hex>`，每個 id 都要有 `decks/<slug>/assets/<id>.<副檔名>`。
   - 這次 session 自己上傳的檔案（例如 MathJax 產生的公式 SVG）直接從本機來源複製並改名。
   - 其他素材用 Artifact `read`，`path` 設成單一 asset id（`paths` 不支援 asset id）。
4. 寫 `decks/<slug>/meta.json`：`title`、`subtitle`、`description`、`date`（YYYY-MM-DD）、`tags`、`artifact`（原本的 artifact 網址，之後同步用）。首頁按 `date` 新到舊排序。
5. `node build.mjs`。輸出有「找不到素材」警告就要補檔；`STRICT=1 node build.mjs` 會在有警告時失敗。
6. 用 `.claude/launch.json` 的 preview 在 http://localhost:8788 看過首頁與幾頁有動畫、公式、表格的投影片。
7. commit 並 push 到 `main`，然後部署（見下方）。

## 播放器怎麼對應 Slides 格式

- `site/slide.css` 模擬 Slides 的子集：沒寫 `display` 的 `<div>` 是直向 flex；寫了 `display:flex` 就是 CSS 預設（橫向）。`<section>` 是 1920×1080、`box-sizing:border-box`。
- `<x-embed>` 在 build 時變成 `<iframe sandbox="allow-scripts" data-srcdoc>`，播放器只在目前那頁載入（離開就卸載，回來重播），並把 `devicePixelRatio` 設成 2 讓縮放後的 canvas 清楚。
- `<x-shape>` 用 CSS clip-path 畫；`<x-icon>` 還沒實作圖示，用到時要補。
- `<aside>` 是講者備註，按 N 顯示。
- 不支援的東西（`data-build-in` 動畫、magic move 轉場、`data-video`）目前會被忽略。

## 部署

- 網站：https://learning-decks.zichaoleng55.workers.dev（Worker 名稱 `learning-decks`，帳號 zichaoleng55@gmail.com）。
- `wrangler.jsonc`：只有 assets 的 Worker，`assets.directory` 是 `./dist`。
- 從使用者這台電腦部署：`node build.mjs && env -u CLOUDFLARE_API_TOKEN npx -y wrangler@4 deploy`。環境裡有一個舊的 `CLOUDFLARE_API_TOKEN` 權限不足（403），會蓋過使用者的 `wrangler login`，所以部署時要把它拿掉。
- 目前還沒有接 GitHub 自動部署；使用者若在 Cloudflare 後台把這個 Worker 連到 repo（Settings › Builds），之後 push 就會自動部署，build command 用 `npm run build`。
- 部署後用 curl 或瀏覽器確認首頁、`/<slug>/` 和一個素材檔都回 200。
- 沒有任何 npm 相依套件，`dist/` 不進 git。
