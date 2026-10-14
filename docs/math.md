# 公式：LaTeX → SVG

使用者要求公式要像 LaTeX 一樣漂亮。做法是用 MathJax 把 LaTeX 轉成純向量的 SVG（字形都轉成路徑，不需要字型），當成圖片放進投影片。

## 步驟

1. 第一次先在 repo 根目錄 `npm install`（會裝 `mathjax-full`）。
2. 把公式寫進 `decks/<slug>/formulas.txt`，一行一個：

   ```
   // 名稱     顏色      字級(px)  LaTeX（照寫，不用跳脫反斜線）
   relu       #17212B   42   y = \max(0,\; w x + b)
   kink       #B5531C   32   x = -\frac{b}{w}
   budget-N   #8A3E12   38   N \approx \frac{B}{\sqrt{8\varepsilon}}
   ```

3. 執行 `node tools/tex2svg.mjs <slug>`。每個公式會變成 `assets/<名稱>.svg`，並印出可以直接貼上的 `<img>` 標籤（含正確的寬高）；寬高也存在 `assets/formulas.json`。
4. 貼進投影片，`alt` 寫成公式的純文字讀法。

## 顏色與字級

| 放在哪裡 | 顏色 | 字級 |
|---|---|---|
| 淺色頁、米色或白色卡片 | `#17212B` | 主公式 40～44；表格內 30 |
| 橘色重點（淺底上的標籤式公式） | `#B5531C` | 30～34 |
| 橘色卡片 `#F4DCC8` 上 | `#8A3E12` | 36～38 |
| 深色頁、深色卡片上 | `#F0995E`（或 `#F3EEE3`） | 34～36 |

同一個式子要放在不同底色時，用不同名稱產生兩個檔。

## 寫法建議

- 函數名用 `\max`、`\sin`、`\log`；自訂的用 `\mathrm{ReLU}`。
- 向量用 `\mathbf{w}\cdot\mathbf{x}`。
- 分數：主公式用 `\frac`，行內小分數用 `\tfrac`（比較矮，適合放在一行裡）。
- 需要很矮的式子（放在一排文字旁邊）避免分數，例如寫 `N \propto \varepsilon^{-1/2}` 而不是 `\frac{1}{\sqrt\varepsilon}`。
- 加空白：`\,` `\;` `\quad`。
- 公式裡**不要放中文**（MathJax 沒有中文字形）。中文標籤寫在旁邊的 `<p>`。
- 內文裡單一字母變數（w、b、x）直接打字即可；二階導數寫 f″。

## 動畫裡的數學字

canvas 裡不能用這些 SVG，改用 `docs/animations.md` 的 `mt()`：英文字母斜體、數字和符號正體，字型用 Cambria Math／STIX Two Math／Times New Roman。
