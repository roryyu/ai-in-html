# sashimi-ui 组件与 class 速查（v2.1.0）

sashimi-ui 是 MIT 许可的**纯 CSS 组件库**：只有 class，没有运行时 JS，没有构建步骤。本文件是 `ai-html`
唯一引用的 sashimi 事实面——46 个 class、26 个组件、33 个 `--sui-*` 令牌，全部逐条对照
`ai-html/vendor/sashimi-ui/` 里 vendored 的 v2.1.0 原始文件抄录。**不在本文件里的 class 都是不存在的**，
写上去不会有样式，门禁会直接判 FAIL。上游 https://github.com/yuto-hasegawa/sashimi-ui ，
三个文件的 SHA-256 基线在 `vendor/sashimi-ui/VERSION.md`，许可副本在 `vendor/sashimi-ui/LICENSE`。

---

## 1. 加载方式

三个文件，**顺序固定**：`default.theme.css`（设计令牌，必须先加载）→ `bundle.css`（组件样式）→
`baseline.css`（裸元素基线，可选）。漏掉第一个会得到「无颜色、无圆角、无间距」的裸组件。

离线写法（本仓库产物一律用它，`file://` 双击可开、不需要网络）：

```html
<link rel="stylesheet" href="../vendor/sashimi-ui/default.theme.css">
<link rel="stylesheet" href="../vendor/sashimi-ui/bundle.css">
<link rel="stylesheet" href="../vendor/sashimi-ui/baseline.css">
```

CDN 等价写法（联网环境，版本锁 `2.1.0`）：

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/default.theme.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/bundle.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/baseline.css">
```

锁 `@2.1.0` 不锁 `@latest`：令牌值与小版本变化会让门禁的计算样式断言（圆角 8px、按钮背景非透明）失效。
上游另有 `sui-bundle.css`（把 class 前缀成 `.sui-button` 以避免命名冲突），本仓库未 vendored。

---

## 2. 46 个 class 白名单

门禁把产物里每个 class 字面量与本表逐一比对，**白名单外的非 `ai-` 前缀 class 即 FAIL**。页面自有的布局类
必须用 `ai-` 前缀（见 §6）。46 项按字典序：

```
active, anchor_bottom, anchor_left, anchor_right, anchor_top, button, callout, card,
card-option, checkbox, chip, circular, destructive, details, dialog, dragover, error,
fieldset, file-input, helper-text, icon, info, input, key-value, label, legend, link,
menu-item, meter, modal, passive, popover, progress, radio, seamless, secondary, select,
shy, skeleton, success, switch, tab-item, table, tertiary, textarea, warning
```

前 26 个是要写在特定元素上的**组件主体 class**（`button` `callout` `card` `card-option` `checkbox` `chip`
`details` `dialog` `fieldset` `file-input` `helper-text` `icon` `input` `key-value` `label` `legend`
`link` `menu-item` `meter` `progress` `radio` `select` `switch` `tab-item` `table` `textarea` `error`），
后 20 个是**修饰词**（`active` `anchor_bottom` `anchor_left` `anchor_right` `anchor_top` `circular`
`destructive` `dragover` `info` `modal` `passive` `popover` `secondary` `seamless` `shy` `skeleton`
`success` `tertiary` `warning`）。修饰词的合法搭配见 §3 矩阵。

---

## 3. 修饰组合矩阵

规则来自 `bundle.css` 的真实选择器（多为 `X:where(.mod)` 形式，所以修饰词不带额外权重）。
**越界组合不报错，但也不会有任何样式**——这是最常见的「明明写了 class 却没变化」。

| 基础 class | 合法修饰 | 非法（写了无效） |
| --- | --- | --- |
| `button` | `secondary` `tertiary` `shy` | **`destructive`**、`active`、`error`、`icon` |
| `callout` | `info` `success` `warning` `destructive` | `secondary`、`active` |
| `chip` | `active` | `secondary`、`error` |
| `tab-item` | `active` | `secondary`、`error` |
| `menu-item` | `active` | `secondary`、`error` |
| `link` | `seamless` `passive` | `secondary`、`active` |
| `progress` | `circular` `skeleton` | `secondary`、`active` |
| `file-input` | `secondary` `tertiary` `shy` `error` `dragover` | `circular`、`active` |
| `input` `select` `textarea` `checkbox` `radio` `switch` `label` `legend` `helper-text` `card-option` | `error` | `secondary`、`active` |
| `dialog` | `modal` `popover` `anchor_left` `anchor_right` `anchor_top` `anchor_bottom` | `secondary`、`active` |
| `card` `table` `icon` `meter` `key-value` `fieldset` `details` | 无（任何修饰都无效） | 全部 |

### 3.1 警告：`button destructive` 是非法组合

`bundle.css` 里**不存在** `.button:where(.destructive)` 规则（已在 vendored 文件上核实）。写
`<button class="button destructive">` 的结果是按钮保持主色实心样式——「危险」语义完全丢失，而且比普通按钮
更危险，因为看代码的人以为已经做了视觉区分。危险按钮的正确做法二选一：

1. **页面自有 class + `--sui-color-error` 令牌**（这是自定义扩展，不是 sashimi-ui 的能力，文档必须如实标注）：

   ```html
   <button class="button ai-danger">删除项目</button>
   <style>.ai-danger { background: var(--sui-color-error); color: var(--sui-color-on-key-primary); }</style>
   ```

2. **退回语义层**：用 `callout destructive` 承载「此操作不可逆」的警示，真正的删除动作放进确认 `dialog`。
   这是 sashimi-ui 原生语义里最强的危险表达。

**禁止**伪造 sashimi class 名来实现危险态（如 `class="button error"`——`error` 不是 button 的合法修饰）。

---

## 4. 26 个组件的真实 markup

上游文档原样片段 + 适用元素与关键属性 + 最常见的写错方式。

| 组件 | markup 片段 | 适用元素 / 关键属性 | 常见错误 |
| --- | --- | --- | --- |
| `button` | `<button class="button">Label</button>` ／ `<a class="button" href="/next">Next</a>` | `button`、`a`；`disabled`，`href` 非空时渲染 `a.button` | 加 `destructive` / `error`（非法）；图标必须写成 `svg.icon` **子元素**，`.button .icon` 会锁死 `1.1em`；给 `a.button` 加 `disabled`（无效） |
| `callout` | `<div class="callout info"><svg class="icon"><use href="#ai-icon-info"></use></svg><p>text</p></div>` | `div`；语义修饰 `info` `success` `warning` `destructive`，不带修饰时是引用体样式 | 正文裸放不包 `<p>`（图标与文字对不齐）；`callout` 里再嵌 `callout` |
| `card` | `<div class="card"><h2>标题</h2><p>正文</p></div>` | `div`、`a`、`button`（也被 `dl.key-value`、`ul` 借用）；无任何合法修饰 | 期待 header/body/footer 子 class（没有）；把 `<a class="card">` 嵌进另一个 `<a>`（非法嵌套） |
| `card-option` | `<label class="card-option"><input class="radio" type="radio" name="g" value="v" /><strong>Title</strong><br />Desc</label>` | `label`；内层控件用 `radio` 或 `checkbox`，标题包 `<strong>`、描述放 `<br>` 之后 | 外面再套一层 `div.card`（两层圆角）；同组 radio 忘记同 `name`（可同时选中多个） |
| `checkbox` | `<label class="label"><input class="checkbox" type="checkbox" checked />Text</label>` | `label` 包裹 `input[type=checkbox]`；`checked` / `name` / `disabled` | 错误态只给 `input` 加 `error` 漏掉 `label`（两处都要）；用 `div` 代替 `label` 导致点文字不切换勾选 |
| `chip` | `<button class="chip active" aria-pressed="true">Filter</button>` | `button`、`span`、`a`；选中态只认 `active` class | 用 `aria-pressed` 代替 `active`（样式不看 ARIA）；把 chip 当主按钮用（它比 `button` 矮） |
| `details` | `<details class="details"><summary>过敏原说明</summary><p>含大豆。</p></details>` | `details`；原生 `open` 属性 | 给 `summary` 套 `button` class（`<summary>` 本身可点，套了是双层样式）；忘记 `details` class（完全没有折叠样式） |
| `dialog` | `<dialog class="dialog" id="about"><p>内容</p><form method="dialog"><button class="button">OK</button></form></dialog>` | `dialog`；JS 侧 `.showModal()`（模态）或 `.show()`（浮层），关闭靠 `form[method=dialog]` 或 `.close()` | 以为写 `open` 属性就是模态（`open` 是非模态、无遮罩）；关闭按钮不放进 `form[method=dialog]`；`showModal()` 在已打开时调用会抛错 |
| `fieldset` | `<fieldset class="fieldset"><legend class="legend">Seat</legend>…</fieldset>` | `fieldset`，图例用 `legend`；错误态要**下沉到子控件**（上游 React 版会把 fieldset 的 error 传导到每个子组件） | 只给 `fieldset` 加 `error`、子控件保持正常态（看不出哪里错）；`legend` 不用 `legend` class（排版不一致） |
| `file-input` | `<input class="file-input secondary" type="file" accept="image/*" multiple />` | `input[type=file]`；`accept` / `multiple`，修饰 `secondary` `tertiary` `shy` `error` `dragover` | 把 `dragover` 加到外层 `label` 上（只对 `file-input` 自身生效）；拖拽逻辑里判断 `label` 的 class |
| `helper-text` | `<p class="helper-text error">今日例汤已售罄。</p>` | `p`；`error` 表示这是错误说明而非普通提示 | 把正文放进 `helper-text`（辅助字号，长文本会挤成一团）；错误说明只改颜色不改文案 |
| `icon` | `<svg class="icon" aria-hidden="true"><use href="#ai-icon-check"></use></svg>` | `svg`、`img`、`picture`；纯装饰图标必须 `aria-hidden="true"`，`<use>` 指向页面内 sprite | 引用外部 SVG 文件（本工作区要求离线，见 §7）；给装饰图标写有意义的 `alt`（读屏重复朗读）；在 `.button` 里内联写 `width`（与 flex 打架） |
| `input` | `<input class="input" type="number" min="1" max="8" value="2" />` | `input`；`type` 支持 `text` `number` `email` `password` `search` `tel` `url` `datetime-local`，另有 `placeholder` / `name` / `id` / `disabled` / `error` | 给 `input` 加 `secondary`（只有 `error` 合法）；用 `input` 承载长文本（应换 `textarea`） |
| `key-value` | `<dl class="key-value card" style="padding:12px;"><dt>订单号</dt><dd>A-1024</dd></dl>` | `dl`；**必须同时带 `card`**（`key-value` 只提供 `dt`/`dd` 排版），内边距用内联 `style` 补 | 只写 `class="key-value"` 不加 `card`（没有边框圆角）；把 `dd` 写成 `p` |
| `label` | `<label class="label" for="name">昵称</label>` | `label`；`for` / `id` 配对，或直接包裹控件；错误态 `class="label error"` | 既写 `for` 又把控件包进 label（读屏会重复朗读标签） |
| `legend` | `<legend class="legend">Seat</legend>` | `legend`（必须在 `fieldset` 内）；`error` 表示图例本身出错 | 给 `div` 配 `legend`（只在 `fieldset` 里生效） |
| `link` | `<a class="link seamless" href="#top">回到顶部</a>` | `a`、`button`；修饰只有 `seamless`（融入正文的弱链接）与 `passive`（最弱） | 需要次要按钮时写 `link secondary`（非法组合，应改 `button secondary`） |
| `menu-item` | `<ul class="card" style="list-style:none;"><li><button class="menu-item active">导出</button></li></ul>` | `ul.card` > `li` > `button` / `a`；当前项加 `active`，`ul` 需要内联 `list-style:none` | **每个 menu-item 各写一个 `ul`**（会出现 N 个独立列表容器而不是一个菜单）；忘记 `list-style:none` |
| `meter` | `<meter class="meter" min="0" max="100" low="20" high="80" optimum="100" value="72">72%</meter>` | `meter`；`min` / `max` / `low` / `high` / `optimum` / `value`，无修饰 class | 用 `progress` 代替 `meter`（`meter` 表达量程内水位，`progress` 表达任务完成度）；漏掉阈值导致颜色分段全走默认 |
| `progress` | `<progress class="progress" max="100" value="70">70%</progress>` ／ `<progress class="progress"></progress>` | `progress`；`max` / `value`，不给 `value` 即不确定态，修饰 `circular` / `skeleton` | 在 `.button` 里给圆形进度条**同时加 `icon`**——`.button .icon`（权重 0,2,0）盖过 `.progress:where(.circular)`（权重 0,1,0），spinner 被压成 `1.1em`（约 17.6px）而不是 48px；上游文档示例带 `icon`，那是笔误，按钮里只写 `class="progress circular"`。另外 `progress` 是 void 元素，塞 `<span>` 百分比不显示 |
| `radio` | `<label class="label"><input class="radio" type="radio" name="plan" value="team" checked />团队版</label>` | `label` 包裹 `input[type=radio]`；同组必须同 `name`，JS 侧按 `name` 分组读写选中值 | 同组 `name` 不同（互斥失效）；把 `checked` 写在 `label` 上 |
| `select` | `<select class="select" name="spice"><option value="hot">重辣</option></select>` | `select`；`value` 存字符串（不是下标），另有 `options` / `name` / `id` / `disabled` / `error` | 用 option 显示文本当值回填；`multiple` 下仍按单值读写 |
| `switch` | `<label class="label">接收每日菜单<input class="switch" type="checkbox" checked /></label>` | `label` 包裹 `input.switch`（`type` 仍是 `checkbox`）；**文字在控件左边**，与 checkbox 相反 | 把 switch 当「已确认的单选」用（它只是 checkbox 的开关外观）；只给 `label` 加 `error` 漏掉 `input.switch` |
| `tab-item` | `<button class="tab-item">订单</button>` | `button`、`a`；当前页签加 `active`；`tab-item` 设计成贴在一行分隔线之上，容器要自己画线 | 把 `tab-item` 当独立导航条用；`active` 与 `aria-selected` 两套状态不同步 |
| `table` | `<table class="table"><caption>周三午市价目</caption><thead><tr><th scope="col">菜品</th></tr></thead><tbody><tr><td>番茄牛腩饭</td></tr></tbody></table>` | `table`；`<caption>` 必须写在 `<thead>` **之前**，每个 `<th>` 写 `scope="col"` | 用 JS 建表时把 `<caption>` `appendChild` 到 `<tbody>` 之后——HTML **解析器**会把 caption 移回表格开头，但**动态拼 DOM 不会**，caption 会真的渲染在底部 |
| `textarea` | `<textarea class="textarea" rows="4" placeholder="少盐"></textarea>` | `textarea`；`rows`；内容写在标签之间（`value` 属性对 textarea 无效） | 设固定 `height` 而忽略 `rows`；用 `<pre>` 代替（没有边框与内边距） |

---

## 5. 33 个 `--sui-*` 设计令牌

**页面骨架与组件外观的颜色一律走令牌**，不写死 hex / rgb / hsl / 具名颜色——sashimi-ui 自带
`prefers-color-scheme: dark` 覆盖，写死颜色在深色下不可读。18 个颜色令牌（括号内为浅色模式下的字面量值）：

`--sui-color-neutral-primary`（`#31363a` 正文主色）、`--sui-color-neutral-secondary`（`#899196` 次要文字）、
`--sui-color-neutral-tertiary`（`#dbe0e4` 三级中性面）、`--sui-color-on-neutral-tertiary`（`#6c757b`
三级中性面上的文字）、`--sui-color-key-primary`（`#1261ec` 主色，默认按钮底色与链接）、
`--sui-color-on-key-primary`（`#ffffff` 主色之上的文字）、`--sui-color-key-secondary`（`#6093ec`
次级主色，secondary 按钮水波纹）、`--sui-color-key-tertiary`（`#d4e2fc` 三级主色，secondary 按钮描边）、
`--sui-color-outline-primary`（`#c1c8ce` 主描边）、`--sui-color-outline-secondary`（`#e3e7e9`
次描边，tertiary 按钮描边）、`--sui-color-highlight-primary`（`#dfdfe7` 高亮面）、
`--sui-color-highlight-secondary`（`#f6f6f8` 次高亮面，代码块与 hover 底）、`--sui-color-surface`
（`#ffffff` 页面底色）、`--sui-color-disabled-fill`（`#f3f5f8` 禁用底色）、`--sui-color-success`
（`#00a846`）、`--sui-color-warning`（`#d18b00`）、`--sui-color-error`（`#ff4b6c`，自定义危险按钮
class 用它）、`--sui-color-scrim`（`rgba(57, 69, 79, 0.65)` 模态遮罩）。

6 个圆角与间距令牌：`--sui-roundness-strong`（`8px`，按钮与卡片外框）、`--sui-roundness-normal`
（`8px`，输入框与 chip）、`--sui-base-padding`（`12px`，通用内边距与容器间距）、`--sui-icon-gap`
（`0.3em`，图标与文字间距）、`--sui-label-gap`（`4px`，标签与其控件间距）、`--sui-shadow-hover`
（`0px 2px 12px rgba(24, 69, 95, 0.2)`，hover 阴影）。

6 个尺寸令牌：`--sui-input-base-height` `40px`、`--sui-button-height` `40px`、
`--sui-button-font-weight` `400`、`--sui-button-horizontal-padding` `16px`、`--sui-checkbox-size` `20px`、
`--sui-radio-size` `20px`。

3 个水波纹令牌：`--sui-regular-ripple-effect-density` `0.2`、`--sui-broad-ripple-effect-density` `0.5`、
`--sui-button-ripple-effect-content` `""`（留空即关闭水波纹）。18 + 6 + 6 + 3 = 33。

### 5.1 深色模式

`default.theme.css` 末尾的 `@media (prefers-color-scheme: dark)` 覆盖大部分颜色令牌，**不需要自己写 dark
变体 class**。注意三点：`--sui-color-on-key-primary` 深色下变成 `#000000`（主色变亮、文字转黑）；
`--sui-color-error` / `-success` / `-warning` 深色下都换成更亮的值；`--sui-color-surface` 深色下是 `#121212`，
页面背景写死 `white` 会与组件对不上。给自己的页面加一行 `:root { color-scheme: light dark; }` 让表单控件跟随即可。

---

## 6. sashimi-ui **没有**布局与间距工具类

sashimi-ui 是组件样式库，**不是 utility CSS 框架**。它**不存在**任何 flex / grid 工具类（无 `.flex`、
`.row`、`.col-*`）、任何间距工具类（无 `.mt-*`、`.p-*`、`.gap-*`）、任何尺寸或居中类（无 `.w-full`、
`.text-center`）。`.button` / `.card` 内部自带 `display:flex` 或 `inline-flex`，但那是组件内部实现，
不能当可复用的布局原语。推荐两种写法：

```html
<!-- 写法 A：内联 style，一次性简单排版 -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:var(--sui-base-padding);">…</div>

<!-- 写法 B：页面自有 class，一律 ai- 前缀，多处复用时 -->
<style>
.ai-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
           gap: var(--sui-base-padding); align-items: start; }
.ai-row  { display: flex; flex-wrap: wrap; gap: var(--sui-icon-gap); align-items: center; }
@media (max-width: 720px) { .ai-cols { grid-template-columns: 1fr; } }
</style>
```

间距一律用 `--sui-base-padding` / `--sui-icon-gap` / `--sui-label-gap`，不要写 `8px`、`10px` 这类魔数。
**禁止**把自定义类起成 sashimi 名字（`.card-body`、`.stack`、`.sp-4`）：门禁只认 `ai-` 前缀，混进去要么 FAIL，
要么误导后来人以为那是官方 class。

---

## 7. 图标：离线 sprite 约定

上游文档用 `<use href="/home.svg#root">` 引**外部** SVG 文件。本工作区要求产物离线自包含（`file://` 双击可开、
门禁 headless 渲染），所以改为内嵌 sprite，symbol id 固定为 `ai-icon-{name}`：

```html
<svg style="display:none" aria-hidden="true" focusable="false">
  <symbol id="ai-icon-check" viewBox="0 0 24 24"><polyline points="4,12.5 9.5,18 20,6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>
```

`stroke="currentColor"` 让图标跟随文字颜色，`fill="none"` 保持线稿风格；`viewBox` 统一 `0 0 24 24`，
尺寸由 `.icon` 与内联 `width`/`height` 决定。`ai-html` 至少提供 6 个自绘几何符号：`check` `close` `plus`
`info` `warning` `arrow-forward`。**禁止**抄受版权保护的图标路径数据（自绘简单 path / polyline 即可），
**禁止**外链 SVG。

---

## 8. baseline.css 覆盖的裸元素

这些元素**不需要任何 class** 就有像样排版，选它们时不要多加 `ai-` 前缀类（多余 class 只会触发门禁比对）：
`body`（底色、文字色、`1rem`/`1.6` 行高、24px 内边距）、`p`（`margin-block:16px`）、`h1`–`h4`（各自字号字重与间距）、
`hgroup`（含 `h1`–`h4` 时自动配平间距）、`ul`/`ol`/`menu`（`flex column`、`gap:4px`、
`padding-inline-start:20px`）、`mark`（荧光笔）、`hr`（上边框线）、`figure`/`figcaption`（`margin-inline:0`，
caption 走次要文字样式）。未列出的裸元素（`table`、`dl`、`blockquote`、`cite`、`summary` 等）**没有**默认样式，
需要自己排版或套组件 class。
