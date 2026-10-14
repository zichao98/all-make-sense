# 學習簡報

跟 Claude 一起做的互動式學習簡報合集。每份簡報都是 1920×1080 的投影片，裡面的動畫直接在瀏覽器裡跑。

## 看簡報

部署後打開網站首頁，點任一份簡報：

| 操作 | 鍵盤 | 手機 |
|---|---|---|
| 下一頁 | → / 空白鍵 / Enter | 往左滑、點右邊 |
| 上一頁 | ← | 往右滑、點左邊 |
| 講者備註 | N | 「備註」按鈕 |
| 全螢幕 | F | 「全螢幕」按鈕 |

網址後面的 `#5` 代表第 5 頁，可以直接分享某一頁。

## 目錄結構

```
decks/<slug>/
  deck.json        投影片順序、章節、字型（Claude Slides 的格式）
  meta.json        首頁顯示的標題、說明、日期、標籤
  slides/<id>.html 每頁一個 <section>
  assets/<id>.svg  圖片和公式（檔名 = 投影片裡 /_blob/<id> 的 id）
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

推到 GitHub 的 `main` 之後，Cloudflare 會自動跑 `npm run build` 和 `npx wrangler deploy`。
