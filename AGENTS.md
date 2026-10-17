# AGENTS.md：怎麼做出一份「學習簡報」

這個 repo 是一套做互動式學習簡報的流程，給任何 AI agent（Claude、Codex、Cursor、Gemini…）照著做。
做出來的簡報要跟 `decks/deep-learning-intuition/` 一模一樣的風格和品質。
網站：https://all-make-sense.zichaoleng55.workers.dev

**開工前，依序讀完這幾份：**

1. 這份 `AGENTS.md`：流程與硬性規則
2. [`docs/playbook.md`](docs/playbook.md)：內容怎麼想、視覺怎麼設計、版型座標、踩過的坑
3. [`docs/slide-format.md`](docs/slide-format.md)：投影片 HTML 的寫法（受限的子集）
4. [`docs/animations.md`](docs/animations.md)：動畫（`<x-embed>`）的寫法與現成元件
5. [`docs/math.md`](docs/math.md)：公式一律用 LaTeX 轉 SVG
6. [`docs/checklist.md`](docs/checklist.md)：交付前逐項檢查

**範例（照抄改內容最快）：**

- `decks/_template/`：每種版型、每種動畫各一頁，全部用 `［方括號］` 標出要換的地方。
- `decks/deep-learning-intuition/`：一份完成的 25 頁簡報，是品質的標準答案。

## 使用者是誰

- 用繁體中文溝通（常用語音輸入，會有同音錯字，例如「HDMI」其實是 HTML、「MLB」其實是 MLP）。
- 想要的是**直覺（sense）**，不是嚴格證明：例如「看到一個五次方函數，就大概知道要幾個神經元」。
- 喜歡會動的圖，而且動畫最好是真的在算（例如真的在瀏覽器裡訓練網路）。
- 追問會變成同一份簡報的新章節，不另開一份。
- 數學式一定要像 LaTeX 一樣漂亮，等寬字或純文字的公式會被嫌醜。

## 流程

```bash
npm install                                  # 只有產生公式時需要（mathjax-full）
node tools/new-deck.mjs <slug> "<標題>"       # 建立 decks/<slug>/
#   1. 先寫大綱：deck.json 的 sections，每段一句話
#   2. 先用 python / node 算出所有要放上去的數字，記下來
#   3. 從 decks/_template/slides/ 複製版型，一頁一個 slides/<id>.html，把 id 加進 deck.json 的 order
#   4. 公式寫進 formulas.txt，然後：
node tools/tex2svg.mjs <slug>                # 產生 assets/*.svg 並印出 <img> 標籤與寬高
node build.mjs --all --strict                # 有任何警告就失敗
python -m http.server 8788 --directory dist  # 打開 http://localhost:8788/<slug>/ 逐頁看
git add -A && git commit -m "..." && git push
node build.mjs && npx wrangler deploy        # 部署（見下方）
```

## 硬性規則

1. **一頁一個觀念。** 標題是一句話，不超過約 20 個中文字；能用表格、數字卡片、動畫，就不要用條列。
2. **數字一定要算過。** 表格、卡片、內文裡的每個數字都先用腳本算出來或驗證過。不准捏造統計、引用或「研究顯示」。經驗值要明講是經驗值（例如「×2～5，這是本例觀察到的倍數」）。
3. **公式用 LaTeX → SVG。** 不要在投影片上用純文字或等寬字寫多個符號的式子。單一字母變數（w、b、x）可以留在內文。
4. **文字不小於 24px。** 動畫裡的字也是。
5. **畫布固定 1920×1080。** 內容在 128px 邊界內；有頁尾時下邊界 160px，內容不超過 y=920。
6. **只用文件寫的 HTML／CSS 子集**（見 `docs/slide-format.md`）。全部 inline style，沒有 class、沒有 `<style>`、沒有 `<script>`（腳本只能在 `<x-embed>` 裡）。
7. **動畫自己就要能跑。** 不連網、不讀外部檔、自動循環、不需要點擊，每個 `<x-embed>` 不超過 16 KB。
8. **每頁都寫講者備註**（最後一個子元素 `<aside>`），用白話解釋這頁在說什麼、數字怎麼來的。
9. **誠實標示限制。** 理論值跟實際訓練的差距、只在一維成立、只是上界……都要寫出來。
10. **追問就加章節：** 新的章節分隔頁＋幾頁內容，放在相關段落後面；之後各頁的頁碼和 eyebrow 編號要跟著改。

## 檔案位置

```
decks/<slug>/deck.json         order（投影片順序）、sections（大綱）、faces（字型）
decks/<slug>/meta.json         首頁卡片：title、subtitle、description、date、tags
decks/<slug>/formulas.txt      公式清單（tools/tex2svg.mjs 的輸入）
decks/<slug>/slides/<id>.html  每頁一個 <section id="<id>">，id 等於檔名
decks/<slug>/assets/           公式 SVG 與其他圖片；投影片用 src="assets/<檔名>" 引用
decks/_template/               範本（底線開頭的資料夾只有 --all 時才會 build）
site/                          播放器與首頁（一般不用改）
build.mjs                      組成 dist/
tools/                         tex2svg.mjs、new-deck.mjs
```

## 部署

- Cloudflare Workers（只有靜態檔），名稱 `all-make-sense`，設定在 `wrangler.jsonc`。
- **推到 `main` 會由 GitHub Actions 自動部署**（`.github/workflows/deploy.yml`），一般不需要手動部署；PR 只跑嚴格檢查。
- 指令：`node build.mjs && npx wrangler deploy`（需要先 `npx wrangler login`）。
- 在使用者這台 Windows 電腦上，環境變數裡有一個舊的 `CLOUDFLARE_API_TOKEN`，權限不夠（403），會蓋過 `wrangler login`。部署時用 `env -u CLOUDFLARE_API_TOKEN npx -y wrangler@4 deploy`。
- 部署後確認首頁、`/<slug>/`、以及一個 `assets/` 檔案都回 200。

## 跟 Claude Slides 的關係

這個格式來自 claude.ai 的 Slides artifact（同樣的 `deck.json` + `slides/*.html`）。在 Claude 裡做的簡報可以直接搬進來：投影片裡的 `/_blob/<id>` 會被 build 對應到 `assets/<id>.<副檔名>`。細節見 `CLAUDE.md`。
