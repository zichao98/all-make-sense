# 學習簡報

跟 Claude 一起做的互動式學習簡報合集。每份簡報都是 1920×1080 的投影片，裡面的動畫直接在瀏覽器裡跑。

網站：https://all-make-sense.zichaoleng55.workers.dev

## 看簡報

部署後打開網站首頁，點任一份簡報：

| 操作 | 鍵盤 | 手機 |
|---|---|---|
| 下一頁 | → / 空白鍵 / Enter | 往左滑、點右邊 |
| 上一頁 | ← | 往右滑、點左邊 |
| 講者備註 | N | 「備註」按鈕 |
| 全螢幕 | F | 「全螢幕」按鈕 |

網址後面的 `#5` 代表第 5 頁，可以直接分享某一頁。

## 讓 AI agent 做新簡報

把這個 repo 給任何 AI agent，請它先讀 [`AGENTS.md`](AGENTS.md)。裡面有完整流程、設計規則、範本和檢查清單，照著做就能做出跟現有簡報一樣風格的新簡報。

## 目錄結構

```
AGENTS.md          給 AI agent 的入口：流程與規則
docs/              playbook、投影片格式、動畫、公式、檢查清單
decks/<slug>/
  deck.json        投影片順序、章節、字型（Claude Slides 的格式）
  meta.json        首頁顯示的標題、說明、日期、標籤
  formulas.txt     公式清單（LaTeX）
  slides/<id>.html 每頁一個 <section>
  assets/          公式 SVG 和圖片
decks/_template/   每種版型各一頁的範本（node build.mjs --all 才會出現）
tools/             tex2svg.mjs（LaTeX → SVG）、new-deck.mjs（建立新簡報）
site/              播放器與首頁的 CSS / JS
build.mjs          把 decks/ 組成靜態網站，輸出到 dist/
wrangler.jsonc     Cloudflare Workers 設定（只有靜態檔案）
```

## 本機預覽

不需要安裝任何套件，只要有 Node.js 18+：

```bash
node build.mjs
python -m http.server 8788 --directory dist
```

然後打開 http://localhost:8788 。

## 部署

**自動：** 推到 `main`（包括在 GitHub 網頁上直接改檔案、或合併 PR）就會由 GitHub Actions（`.github/workflows/deploy.yml`）build 並部署到 Cloudflare，約一兩分鐘後網站更新。PR 只會跑 `node build.mjs --all --strict` 檢查，不會部署。

第一次要在 repo 的 Settings → Secrets and variables → Actions 加兩個 secret：

| 名稱 | 內容 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare 的 API token（用「Edit Cloudflare Workers」範本建立） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 帳號 ID（Workers 首頁右側可以複製） |

**手動：**

```bash
npm run deploy
```

會先 build 再用 wrangler 上傳到 Cloudflare Workers（需要先 `npx wrangler login`）。
