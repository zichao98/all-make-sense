# 投影片 HTML 格式

每頁是一個檔案 `decks/<slug>/slides/<id>.html`，裡面**只有一個** `<section id="<id>">`，前後不能有其他東西（沒有 `<html>`、`<head>`、`<style>`、`<link>`）。`id` 只能用英數、`_`、`-`，而且要跟檔名一樣。

這個格式跟 claude.ai 的 Slides artifact 相容。我們的播放器（`site/slide.css`）比它寬鬆，但**請只用下面列的東西**，這樣兩邊都能顯示。

## deck.json

```json
{
  "v": 4,
  "createdOnFiles": {"v": 1, "at": "2026-10-15T00:00:00Z"},
  "lists": "css",
  "title": "簡報標題",
  "cover": "cover",
  "order": ["cover", "neuron", "stack"],
  "sections": {
    "s1": {"description": "這一段在講什麼（一句話）", "start": "cover"},
    "s2": {"description": "…", "start": "neuron"}
  },
  "faces": {
    "noto-sans-tc": {"family": "Noto Sans TC", "href": "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"},
    "noto-serif-tc": {"family": "Noto Serif TC", "href": "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;700&display=swap"},
    "jetbrains-mono": {"family": "JetBrains Mono", "href": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap"}
  },
  "designSystems": []
}
```

`order` 決定順序；不在 `order` 裡的投影片會排在最後。`<section hidden>` 不會顯示。

## section

```html
<section id="neuron" data-transition="fade" style="background:#F6F3EC;color:#17212B;font-family:'Noto Sans TC', 'Microsoft JhengHei', Arial, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:24px">
  …
  <aside>講者備註，純文字，最多 4000 字，一定是最後一個子元素</aside>
</section>
```

- 畫布 1920×1080，`padding` 就是邊界（內容寬 1664）。
- 每個 section 都要寫 `background`、`color`、`font-family`。
- 子元素依序排版；`position:absolute` 會釘在投影片上（用 left/top/right/bottom/width/height），要給釘住的文字寫 `width`。
- **後面的元素會蓋住前面的。** 背景卡片（例如動畫的白色底卡）要寫在最前面。

## 可以用的標籤

| 標籤 | 用途 |
|---|---|
| `h1` `h2` `h3` `p` | 文字。一定要自己寫 `font-size`（≥ 24px）。預設：h1 96、h2 64、h3 44、p 32 |
| `ul` `ol` `li` | 清單（只有一層）；但盡量用卡片或表格取代 |
| `b` `i` `u` `a href` `span style="color:…"` `br` | 行內樣式。**span 只能改顏色**，不能改字型、字級 |
| `div` | 容器。沒寫 display = 直向 flex；寫 `display:flex` = 橫向；也可以 `display:grid` |
| `img` | `src="assets/<檔名>"`，一定要寫 `alt`、`width`、`height`、`object-fit:contain|cover` |
| `table` `tr` `th` `td` | 表格，儲存格只能是純文字；欄寬寫在第一列每格的 `width:N%` |
| `svg` | 內嵌向量圖（≤ 52 KB），寫 `aria-label`；**不要放 `<text>`**，標籤用 `<p>` 疊在上面 |
| `hr` | 分隔線 |
| `x-shape kind="arrow-right"` | 色塊形狀：rect、rounded、ellipse、diamond、arrow-right/left/up/down、line；用 `background` 填色 |
| `x-embed` | 動畫（見 `animations.md`），只能是 section 的直接子元素，而且要 `position:absolute` |
| `aside` | 講者備註 |

## 可以用的 CSS（全部 inline）

- 長度只用 px（或少數地方用 %），不要用 em、rem、vw、`var()`、`margin`、`z-index`。
- 版面：`display`（flex/grid）、`flex-direction`、`flex`、`flex-wrap`、`gap`、`align-items`、`align-self`、`justify-content`、`grid-template-columns`（可以用 `repeat(3, 1fr)`）、`width`、`height`、`min-width`、`max-width`、`padding`、`position`、`left`/`top`/`right`/`bottom`、`overflow`、`aspect-ratio`。
- 文字：`font-family`、`font-size`、`font-weight`（整百）、`font-style`、`line-height`、`letter-spacing`、`text-align`、`white-space:nowrap`、`text-transform`、`color`。
- 外觀：`background`（顏色或漸層）、`border`、`border-top/right/bottom/left`、`border-radius`、`box-shadow`、`opacity`、`transform`（translate、rotate、scale）。

## 常用片段

**eyebrow + 標題：**

```html
<p style="font-size:24px;font-weight:700;letter-spacing:2px;color:#B5531C">01 · 一個神經元</p>
<h2 style="font-family:'Noto Serif TC', Georgia, serif;font-size:64px;font-weight:700;line-height:1.15;color:#17212B">一個 ReLU 神經元＝一個轉折</h2>
```

**有色標籤的重點句：**

```html
<p style="font-size:28px;line-height:1.5;color:#4A5563"><b><span style="color:#B5531C">一邊是 0：</span></b>括號裡小於 0 的那一側，輸出全部是 0</p>
```

**公式卡：**

```html
<div style="display:flex;flex-direction:column;align-items:start;background:#ECE6DA;padding:30px 32px;border-radius:12px">
<img src="assets/relu.svg" alt="y = max(0, w x + b)" style="width:363px;height:42px;object-fit:contain">
</div>
```

**句子中間夾公式：**

```html
<div style="display:flex;flex-direction:row;align-items:center;gap:12px">
<p style="font-size:28px;font-weight:700;color:#B5531C">轉折點</p>
<img src="assets/kink.svg" alt="x = −b/w" style="width:123px;height:67px;object-fit:contain">
<p style="flex:1;font-size:28px;color:#4A5563">b 決定位置，w 決定陡度和方向</p>
</div>
```

**頁尾：**

```html
<p style="position:absolute;left:128px;bottom:64px;width:600px;font-size:24px;color:#7A828C">深度學習的直覺 · 07</p>
```
