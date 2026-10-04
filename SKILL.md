---
name: ai-in-html
description: Use this skill to create an HTML page or single-file HTML prototype with sashimi-ui components, optionally driven by a JSON UI spec through the bundled json-render-style runtime, plus a playground for iterating on landing page, dashboard, and form layouts. Also use it to ANSWER complex questions with a one-page HTML explainer: write a short extended-Markdown draft and render it with the bundled answer-me CLI (flow/sequence/tree/timeline/table/callout components, no hand-written HTML/CSS/SVG).
---

# ai-in-html

两类产物，三个模式：**做界面**用 **sashimi-ui**（纯 CSS 组件库）产出 HTML 页面（Mode A 手写静态
HTML，Mode B 扁平 JSON spec 驱动渲染，共用同一套 class 白名单与设计令牌）；**答问题**用 vendored
的 answer-me CLI 把一页扩展 Markdown 草稿渲染成 HTML 讲解页（Mode C）。产物都离线自包含（`file://` 双击可开）。

## 何时用这个技能

适用：

- 要交付一个 **HTML page** / **landing page** / **dashboard** / **form** / **prototype**，技术栈只要一个静态文件。
- 用户问了一个**复杂问题要解释**（≥3 个相互关联的概念、流程/协议/架构、多维对比、层级/时间演进，
  或用户说「讲讲原理 / 没看懂 / 画个图 / 用 HTML 讲」），希望得到一页可读的 HTML 回复而非文字墙 → Mode C。
- 要用 **sashimi-ui** 的组件与 `--sui-*` 设计令牌，且产物必须**离线自包含**（无 CDN、无构建、无依赖）。
- 界面要由 **UI spec**（扁平 JSON）描述，并希望在 React 侧复用同一份描述（可平移到 json-render 的 registry）。
- 需要一个 **playground** 反复改 spec、看渲染结果与状态，不必每次重写 HTML。
- 已有页面要「补齐组件语义」（`th` 的 `scope`、图标 `aria-hidden`、装饰图标 sprite 化）。

不适用：

- 需要真实后端数据、路由或登录态的**界面**——Mode A/B 只产出静态前端外壳。
- 需要构建工具链、npm 依赖打包或框架组件库（React / Vue / Svelte 的工程化项目）。
- 一两句就能答清的问题（约 150 字内）、要立即复制执行的命令、纯代码修改、用户要求纯文本——不出页面，正常文字回复。
- 需要复杂交互（拖拽排序、富文本、动画编排、图表）——sashimi-ui 是组件样式库，不含这些能力。
- 需要组件库本身没有的东西时不要硬凑：它**没有**布局/间距工具类，也没有危险按钮样式，见 `references/sashimi-catalog.md`。

## 三种模式

| | Mode A 静态直出 | Mode B spec 驱动 | Mode C 一页 HTML 回复 |
| --- | --- | --- | --- |
| 干什么 | 做界面：结构已知的静态页 | 做界面：运行时才确定的交互页 | 答问题：把复杂解释渲染成一页讲解 |
| 产物 | 手写 HTML + sashimi class，**零 JS** | 同一份 HTML + 一段 spec 常量 + `runtime/ai-html.js` | 扩展 Markdown 草稿 → CLI 出一页单文件 HTML |
| 交互 | 只有 HTML 原生（`details`、`dialog`、表单） | 状态、条件渲染、`$bindState` 双向绑定、动作派发 | 讲解页自带主题/明暗切换与源码复制按钮 |
| 类比 | json-render 的「静态子集」 | json-render spec 契约的**本仓库实现子集** | answer-me-with-html 的草稿→渲染契约（CLI 已 vendored） |

**做界面默认 Mode A。** 只有出现下面任一情况才升级到 Mode B：

```
界面结构在写 HTML 时还不确定（要运行时由 LLM 生成 / 要用户输入后才出现）
需要状态、条件渲染、双向绑定或 watch 联动
需要同一份 UI 描述跨端复用（同一份 spec 未来平移到 React）
```

三条都不满足 → 写 Mode A。写完发现需要一处联动 → 先试 `<details>` / `<dialog>` 这类原生元素，
再加内联 `<script>` 改单个控件；只有当「状态散落在三处以上」时才整体搬到 Mode B。

## Mode A：静态直出

6 行骨架（相对路径指向 vendored CSS，顺序固定，`default.theme.css` 必须先加载）：

```html
<link rel="stylesheet" href="../vendor/sashimi-ui/default.theme.css">
<link rel="stylesheet" href="../vendor/sashimi-ui/bundle.css">
<link rel="stylesheet" href="../vendor/sashimi-ui/baseline.css">
<main class="card"><h1>标题</h1><p>正文，无需 class</p>
  <button class="button">主按钮</button> <span class="chip active">v2.1.0</span>
</main>
```

CDN 等价写法（联网环境，版本锁 `2.1.0`）：

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/default.theme.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/bundle.css">
```

完整可读样例见 `examples/static.html`（今日菜单主题，零 `<script>`）。

## Mode B：spec 驱动

最小可运行 spec（扁平结构：`root` 是元素 id，`children` 是**元素 id 数组**）：

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Card", "children": ["title", "name", "echo"] },
    "title": { "type": "Heading", "props": { "level": 2, "text": "Mode B" } },
    "name": { "type": "Input", "props": { "id": "who", "type": "text", "value": { "$bindState": "/form/name" } } },
    "echo": { "type": "Callout", "props": { "variant": "info", "text": { "$template": "你好，${/form/name}" } } }
  }
}
```

挂载代码（`runtime/ai-html.js` 是**经典 script**，不是 ES module，`file://` 下可用；`render()` 同步完成首屏）：

```html
<script src="../runtime/ai-html.js"></script>
<div id="app"></div>
<script>
var ctl = AIHtml.render(SPEC, document.getElementById("app"), {
  state: { form: { name: "" } },
  handlers: { announce: function (p, ctx) { console.log(p, ctx.getState()); } },
  functions: { rate: function (a) { return Math.round(a.n / a.d * 100) + "%"; } }
});
</script>
```

完整模板见 `examples/spec-driven.html`，五类可复制骨架见 `references/recipes.md`，
交互式编辑器见 `playground/index.html`。

## Mode C：一页 HTML 回复

回答复杂问题时，**只写内容稿（扩展 Markdown），不手写 HTML / CSS / SVG**——排版、面板网格、
图形坐标、主题配色全部由 vendored 的 answer-me CLI 完成。模型写稿量约为手写 HTML 的 1/7。

判断（满足任一条才出页面）：≥3 个相互关联的概念；流程/协议/调用链/状态迁移（带分支多参与者尤甚）；
≥3 个维度的对比或取舍；层级结构或时间演进。拿不准时，问题越「要看图才懂」越该出页面。

工作流（一次 Bash 调用）：

1. 心里列 3～8 个面板，每个只回答一个子问题；第一个面板或导语放核心结论。
2. 按信息形状选组件（flow / sequence / tree / timeline / limits / annot / kv / callout / 表格），
   草稿语言跟随提问语言。完整语法见 `references/answer-draft.md`。
3. 把 `AM` 设为本 SKILL.md 所在目录的绝对路径，heredoc 一次渲染：

````bash
node "$AM/vendor/answer-me-with-html/am.mjs" render - --no-open <<'AM_EOF'
---
title: TCP 三次握手
---
## A 握手过程 {span=2}
```sequence num
Client -> Server: SYN
Server -> Client: SYN+ACK
Client -> Server: ACK
```
AM_EOF
````

4. 读输出：`✓ <路径>` 成功；`✗ L<行号> [组件] …` 照给出的示例改那一行再渲染一次；
   `STE n 条警告` 按建议改写，最多重试 2 轮。
5. 终端回复只给 2～3 行：一句核心结论 + 页面路径（单文件 HTML，离线可开）。
6. 已有页面只改一个面板时用 `patch page.html --panel "标题"`，不要整页重写。

草稿语法、组件最小写法、STE 受控写作与 `patch` / `config` 细节见 `references/answer-draft.md`；
缺语法时跑 `node "$AM/vendor/answer-me-with-html/am.mjs" help <component>`。

## 组件速查

31 个 type（完整 props 与限制见 `references/spec-contract.md` §8，class 与 markup 见 `references/sashimi-catalog.md` §4）：

| type | 渲染成 | 关键 props |
| --- | --- | --- |
| `Stack` | `div` + 内联 flex | `direction` `gap` `align` `justify` `wrap` |
| `Grid` | `div` + 内联 grid | `columns`（数字或 CSS 串）`minWidth` `gap` |
| `Card` | `div` / `a` / `button` + `.card` | `as` `href` `action` |
| `Fieldset` | `fieldset.fieldset` + `legend.legend` | `legend` `error` |
| `Divider` | `hr`（无 class） | 无 |
| `KeyValue` | `dl.key-value card` | `items`（`{label,value}`）`padding` |
| `Heading` | `h1`–`h4`（无 class） | `level`（1..4）`text` |
| `Text` | `p`（无 class） | `text` |
| `Chip` | `button` / `span` / `a` + `.chip` | `label` `active` `as` `href` |
| `Callout` | `div.callout` + 语义修饰 | `variant` `title` `text` `icon` |
| `Link` | `a.link` / `button.link` | `text` `href` `variant` `as` |
| `Icon` | `svg.icon` + `<use>` | `name` `size` |
| `Button` | `button` / `a` + `.button` | `label` `variant` `disabled` `loading` `icon` |
| `Input` | `input.input` | `value` `type` `placeholder` `error` |
| `Textarea` | `textarea.textarea` | `value` `rows` `placeholder` `error` |
| `Select` | `select.select` | `options` `value` `error` |
| `Checkbox` | `label.label` > `input.checkbox` | `label` `checked` `error` |
| `Radio` | `label.label` > `input.radio` | `label` `name` `value` `checked` |
| `Switch` | `label.label` > `input.switch` | `label` `checked` |
| `FileInput` | `label.label` > `input.file-input` | `label` `accept` `multiple` `variant` |
| `CardOption` | `label.card-option` > `input` | `title` `description` `control` `checked` |
| `Table` | `table.table` | `columns`（`{key,label}`）`rows` `caption` |
| `Progress` | `progress.progress` | `value` `max` `indeterminate` `variant` |
| `Meter` | `meter.meter` | `value` `min` `max` `low` `high` `optimum` |
| `Details` | `details.details` + `summary` | `summary` `open` |
| `TabItem` | `button` / `a` + `.tab-item` | `label` `active` `href` |
| `MenuItem` | 连续兄弟共用的 `ul.card` > `li` > `.menu-item` | `label` `active` `href` |
| `Dialog` | `dialog.dialog` + 关闭按钮 | `open` `mode` `anchor` `title` |
| `Label` | `label.label` | `text` `for` `error` |
| `Legend` | `legend.legend` | `text` `error` |
| `HelperText` | `p.helper-text` | `text` `error` |

## 硬规则

1. 只用 `references/sashimi-catalog.md` §2 列出的 **46 个 class**；页面自有布局类一律加 `ai-` 前缀。
2. 修饰组合严格按 §3 的矩阵；越界组合不报错但**没有任何样式**。
3. **禁止写 `class="button destructive"`**——sashimi-ui 没有这条规则；危险按钮用 `ai-` 前缀 class 配
   `--sui-color-error`，或退回 `callout destructive` + 确认 `dialog`。
4. 颜色只用 `--sui-*` 令牌，**不写死** hex / rgb / hsl / 具名颜色（深色模式由 `prefers-color-scheme` 自动切换）。
5. 记住 sashimi-ui **没有**布局与间距 class：布局写内联 `style` 或 `ai-` 前缀 class，间距用
   `--sui-base-padding` / `--sui-icon-gap` / `--sui-label-gap`。
6. 写 spec 时把 `children` 写成**元素 id 数组**，绝不内联元素对象。
7. 渲染文本一律 `textContent`，**禁止** `innerHTML` 拼接 state 或用户数据。
8. 保持产物**离线自包含**：不得出现任何外链 `src` / `href` / `url()` / `@import` / `fetch(`。
9. 图标走页面内嵌 sprite（symbol id 用 `ai-icon-{name}`），禁止外链 SVG 文件、禁止抄受版权保护的路径数据。
10. 交付前用 `AIHtml.validate(spec)` 自查，**必须 `ok: true`** 才算完成。
11. `Heading` / `Text` / `Divider` 不要加任何 class——`baseline.css` 已给裸元素样式。
12. `Button` 想用主色就**省略** `variant`（默认就是主色实心）；加载态直接写 `loading: true`。
13. `Dialog` 的 `open` 推荐写 `$bindState`（别的元素才能用 `visible` 读到开关态）；写死 `open: true` 也能正常关掉。
14. 布尔开关 `Checkbox` 与 `Switch` 都可自由用，两者首帧都会正确读出 `checked` / `$bindState`。
15. 加载 CSS 时保持 `default.theme.css` → `bundle.css` → `baseline.css` 的顺序，不要调换。
16. Mode C 只写草稿，**禁止**为出页手写 HTML/CSS/SVG 或把 HTML 贴回终端；页面由 CLI 生成，坐标由 CLI 计算。
17. Mode C 不编数据：没有真实数字就不用 `limits`；示意数据必须写明「示意」；无据结论不上页。

## 交付前自查

Mode B 必做：跑 `AIHtml.validate(spec)`，`ok` 为假时按 `errors` 逐条改（错误信息含元素 id）。

两模式共用的可 grep 清单：

```text
default.theme.css   bundle.css   baseline.css
class="card"   class="button"   class="callout"   class="table"
--sui-          var(--sui-      ai-
id="selftest"
```

反向检查（这些**不该**出现）：

```text
https://     http://     innerHTML     require(     ^import     ^export
button destructive     .flex     .grid     .mt-     .p-
```

再确认三件事：图标 `<use href="#ai-icon-…">` 在同页 sprite 里存在；每个 `<th>` 有 `scope="col"`；
装饰图标有 `aria-hidden="true"`。

## 参考文件

| 文件 | 用途 |
| --- | --- |
| `references/sashimi-catalog.md` | sashimi-ui 事实面：加载方式、46 个 class、修饰矩阵、26 个组件 markup、33 个令牌、深色模式 |
| `references/spec-contract.md` | spec 契约与 runtime API：表达式、`visible`、`watch`、actions、`validate`、31 个 type 的 props、缺陷修复记录、与真实 json-render 的差异 |
| `references/recipes.md` | 五个可复制的 spec 骨架（落地页 / 仪表盘 / 表单 / 设置页 / 报告页）+ 升级到 `@json-render/*` 的路径 |
| `references/answer-draft.md` | Mode C 草稿语法：调用方式、frontmatter、9 类组件最小写法、STE 写作、`patch` 与回复纪律 |
| `examples/static.html` | Mode A 模板：纯 HTML + sashimi class，**零 JS**，可读性参照 |
| `examples/spec-driven.html` | Mode B 最小模板：spec 常量 + 挂载 + 同步自测挂点 |
| `playground/index.html` | 交互式 playground：左侧改 spec，右侧看渲染 / 状态 / 动作日志 |

## 出处与许可

| 上游 | 版本 | 许可 | 在本仓库的角色 |
| --- | --- | --- | --- |
| [vercel-labs/json-render](https://github.com/vercel-labs/json-render) | spec 形态对齐 | Apache-2.0 | spec 结构与表达式命名的参照 |
| [yuto-hasegawa/sashimi-ui](https://github.com/yuto-hasegawa/sashimi-ui) | 2.1.0 | MIT | vendored 到 `vendor/sashimi-ui/`，门禁按 SHA-256 比对 |
| [QingYunA/answer-me-with-html](https://github.com/QingYunA/answer-me-with-html) | 0.4.6 | MIT | Mode C 的渲染 CLI，vendored 到 `vendor/answer-me-with-html/am.mjs`（单文件，需 Node.js 20+） |

诚实声明：`runtime/ai-html.js` 是**json-render spec 契约的一个子集的独立实现**，不是 `@json-render/*`
的代码，也没有 vendored 它们的任何一行。它不实现 SpecStream 流式增量、不实现 `@json-render/directives`
指令包（`$format` / `$math` / `$concat` 等）、不实现真实锚定的 popover，也不做逐 prop 的类型校验。
sashimi-ui 三个 CSS 文件是上游原样取件，未做任何改写。
