# all-make-sense（給 Claude）

**先讀 `AGENTS.md`**：做簡報的完整流程、規則和文件都在那裡，所有 AI agent 共用。這份只補充 Claude 專屬的事。

## 從 claude.ai 的 Slides artifact 搬進來

在 Claude 裡做好的 Slides artifact（`project/deck.json` + `project/slides/<id>.html`）可以直接放進這個 repo：

1. 用 Artifact `read` 搭配 `paths`，讀 `project/deck.json` 和 `order` 裡每一張 `project/slides/<id>.html`，複製到 `decks/<slug>/deck.json` 與 `decks/<slug>/slides/`。
2. 素材：投影片裡的 `/_blob/<32 位 hex>`，每個 id 都要有 `decks/<slug>/assets/<id>.<副檔名>`，build 會自動對應。
   - 這次 session 自己上傳的檔案（例如 MathJax 產生的公式 SVG）直接從本機來源複製並改名。
   - 其他素材用 Artifact `read`，`path` 設成單一 asset id（`paths` 不支援 asset id）。
3. 寫 `meta.json`，`artifact` 欄位填原本的 artifact 網址，之後同步用。
4. 照 `AGENTS.md` 的流程 build、預覽、commit、push、部署。

## 在 Claude Slides 裡做公式

Slides artifact 的圖片要先上傳成 asset。用 `tools/tex2svg.mjs` 產生 SVG 後，以 Artifact `publish`（`asset: true`）上傳，投影片裡用回傳的 `/_blob/<id>`。

## 播放器怎麼對應 Slides 格式

- `site/slide.css` 模擬 Slides 的子集：沒寫 `display` 的 `<div>` 是直向 flex；寫了 `display:flex` 就是 CSS 預設（橫向）。`<section>` 是 1920×1080、`box-sizing:border-box`。
- `<x-embed>` 在 build 時變成 `<iframe sandbox="allow-scripts" data-srcdoc>`，播放器只在目前那頁載入（離開就卸載，回來重播），並把 `devicePixelRatio` 設成 2 讓縮放後的 canvas 清楚。
- `<x-shape>` 用 CSS clip-path 畫；`<x-icon>` 還沒實作圖示，用到時要補。
- 不支援的東西（`data-build-in` 動畫、magic move 轉場、`data-video`）目前會被忽略。
