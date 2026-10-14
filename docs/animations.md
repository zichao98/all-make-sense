# 動畫（`<x-embed>`）

動畫是這系列簡報的靈魂：能動的地方就讓它動，而且最好是真的在算（真的內插、真的訓練、真的傅立葉係數），不是預錄的。

## 規則

- `<x-embed>` 是 section 的**直接子元素**，`position:absolute`，寫好 left/top/width/height。裡面是一份完整的小網頁（`<!doctype html>…</html>`）。
- 標準尺寸：右側動畫卡 **left 880, top 296, 912×624**（前面先放同位置的白色底卡 div）；封面寬版 **left 128, top 640, 1664×300**。
- **每個 embed ≤ 16 KB**（build 會警告）。
- 沙盒環境：**不能連網、不能載入字型或外部檔**、使用者不能點擊或輸入。動畫要自己循環播放。
- 用系統字型（見 `playbook.md`）；字級 ≥ 24px。
- 背景透明（底色由底卡負責）。
- 用 `requestAnimationFrame` 循環；用 `performance.now()` 算時間，用 `t % 週期` 或 `Math.floor(t/每段秒數) % 段數` 切換階段。
- **JS 裡不要寫 `<` 或 `&`**：`i<N` 寫成 `N>i`，`a&&b` 寫成巢狀 if。正規表達式裡的中文範圍用 `一-鿿`。
- 播放器只在目前那頁載入動畫，離開就卸載，所以回到該頁時會從頭播放。播放器會把 `devicePixelRatio` 設成 2，canvas 要用下面的 `fit()` 寫法才會清楚。

## 共用開頭（每個 embed 都從這裡開始）

```js
var cv=document.getElementById('c'),g=cv.getContext('2d'),W,H;
function fit(){var d=window.devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0)}
onresize=fit;fit();
```

外層 HTML：

```html
<x-embed style="position:absolute;left:880px;top:296px;width:912px;height:624px"><!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>
…
</script></body></html></x-embed>
```

## 現成元件（都在 `decks/_template/slides/`，改最上面的 CONFIG 就能用）

| 檔案 | 動畫 | CONFIG |
|---|---|---|
| `cover.html` | 折線越分越細地貼近一條曲線 | `f(x)`、段數序列 `Ns` |
| `text-embed.html` | 一維函數隨參數變化，標出特殊點，底下兩行數學說明 | 範圍、`params(t)`、`f(x,q)`、`mark(q)`、說明文字 |
| `train.html` | 三個一層 ReLU 網路（4／13／40 個神經元）用 Adam 真的訓練，顯示最大誤差與轉折點 | `target(x)`、`Ns`、步數、學習率 |
| `surface.html` | 3D 曲面 z = f(x, y, t)，畫家演算法＋光照，正值橘負值藍 | `f(x,y,t)`、`VIEW` |
| `heatmap.html` | 兩張俯視熱圖並排，可加方向箭頭 | `left(x,y,t)`、`right(x,y,t)`、`arrowDir(t)` |

`decks/deep-learning-intuition/slides/` 裡還有更多可以抄的：

| 檔案 | 內容 |
|---|---|
| `stack.html` | 一個一個加神經元，看折線逐段貼合 |
| `x5.html` | 上下兩排比較「均勻放轉折」與「照彎曲程度放」，N 循環變化 |
| `sawtooth.html` | 鋸齒函數層層疊加（深度讓段數翻倍） |
| `square.html` | Yarotsky 的 x² 構造＋每層誤差的長條圖 |
| `gibbs.html` | 傅立葉級數 vs ReLU 折線（含吉布斯現象），係數在 JS 裡用數值積分算 |
| `spectral.html` | 真實訓練＋兩個頻率各學到幾成的長條（頻譜偏差） |
| `creases.html` | 二維平面上 N 條折痕切出的區域，用離屏 canvas 上色並數區域數 |
| `bump.html` | 3D 曲面在三個函數之間平滑變形 |

## 小工具

```js
// 座標系：把 [a,b]×[c,d] 對到畫面上 (x0,y0,w,h)
function P(x0,y0,w,h,a,b,c,d){return{x0:x0,y0:y0,w:w,h:h,a:a,b:b,c:c,d:d,X:function(x){return x0+(x-a)/(b-a)*w},Y:function(y){return y0+(d-y)/(d-c)*h}}}
// 畫函數（會裁切在框內）
function plot(p,fn,col,lw,dash){g.save();g.beginPath();g.rect(p.x0,p.y0,p.w,p.h);g.clip();g.strokeStyle=col;g.lineWidth=lw;g.setLineDash(dash||[]);g.beginPath();for(var i=0;400>=i;i++){var x=p.a+(p.b-p.a)*i/400,y=fn(x);i?g.lineTo(p.X(x),p.Y(y)):g.moveTo(p.X(x),p.Y(y))}g.stroke();g.restore()}
// 一般文字
function txt(s,x,y,col,sz,al,wt){g.fillStyle=col;g.font=(wt||400)+' '+sz+'px "Segoe UI","Microsoft JhengHei","PingFang TC",sans-serif';g.textAlign=al||'left';g.fillText(s,x,y)}
// 像 LaTeX 的數學字：英文字母斜體、數字正體、中文用一般字型
function mt(s,x,y,col,sz){g.fillStyle=col;g.textAlign='left';for(var i=0;s.length>i;i++){var ch=s[i];g.font=/[一-鿿]/.test(ch)?'700 '+sz+'px "Microsoft JhengHei",sans-serif':(/[a-z]/i.test(ch)?'italic ':'')+(sz+2)+'px "Cambria Math","STIX Two Math","Latin Modern Math","Times New Roman",serif';g.fillText(ch,x,y);x+=g.measureText(ch).width}}
// 負號用真正的減號
function fm(v){return v.toFixed(2).replace('-','−')}
// 可重現的亂數
function rng(s){return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
```

## 做好之後

- 先在 node 裡跑一次動畫的計算部分（特別是訓練），確認數值合理。
- build 後在瀏覽器打開那一頁，看動畫至少跑完一輪：文字沒有被裁掉、沒有超出底卡、循環切換正常。
