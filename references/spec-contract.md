# JSON spec 契约与 runtime API

本文件描述 `ai-html/runtime/ai-html.js`（`version` = `1.0.0`）**实际实现**的行为：spec 结构、表达式求值、
动作派发、校验规则、`window.AIHtml` 每个方法的签名与返回值、31 个 type 的 props。字段名与
vercel-labs/json-render 的 spec 形态对齐，目的是让同一份描述能平移到真实库；但这是本仓库的**独立实现**，
不是上游代码，差异逐条列在 §10。class 事实面看 `sashimi-catalog.md`，整页 spec 看 `recipes.md`。

---

## 1. spec 结构（扁平，不是嵌套树）

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "props": { "direction": "column" }, "children": ["card1"] },
    "card1": { "type": "Card", "children": ["title"] },
    "title": { "type": "Heading", "props": { "level": 2, "text": "标题" } }
  }
}
```

- `root`：必填非空字符串，必须是 `elements` 里存在的 key；渲染从它开始深度优先。
- 元素字段：`type`（必填字符串，必须在 catalog 内）、`props`（默认 `{}`）、`children`（默认 `[]`，
  **元素 id 数组，不是内联对象**）、`visible`（§3）、`watch`（§4）。
- 一个 id 可被多个父节点引用（是图不是树），只要不成环；成环在渲染和校验两处都会被抓出来。

---

## 2. 表达式

出现在**任意 prop 值位置**（含数组元素与对象成员），递归求值。先判断是否表达式对象，否则下钻其成员。

| 表达式 | 求值结果 |
| --- | --- |
| `{ "$state": "/form/name" }` | 读 state 路径；路径不存在返回 `undefined` |
| `{ "$bindState": "/form/name" }` | 读同一路径，额外让控件进入双向绑定（§7.4） |
| `{ "$cond": <cond>, "$then": <v>, "$else": <v> }` | cond 为真取 `$then` 否则取 `$else`，两分支再递归求值 |
| `{ "$template": "共 ${/a/b} 项" }` | 字符串插值，`${}` 内是路径；路径不存在替换为空串 |
| `{ "$computed": "fnName", "args": { … } }` | 调 `opts.functions.fnName(args)`；未注册返回 `undefined` |

路径是 JSON Pointer 风格 `/a/b/0/c`，支持 `~1` → `/`、`~0` → `~` 转义，根是空串或 `/`。
`$template` 是普通字符串里的正则替换，`$` 只在 `${` 后开始一段路径。**`${}` 里只能写状态路径**：
放表达式对象会被当成路径查表而得到空串，所以 `$template` 不能嵌套其它表达式（要组合就并列成两个元素）。
`$template` 求值结果恒为字符串，非字符串输入返回空串。

condition 形态：`{ "$state": "/p", "eq"|"ne"|"gt"|"gte"|"lt"|"lte": v }`、`{ "$state": "/p", "truthy": true }`
（`truthy: false` 取反真值）、`{ "$state": "/p", "contains": v }`（数组含元素或字符串含子串）、
裸 `{ "$state": "/p" }`（按真值判断），任意形态可加 `"not": true` 取反。
细节：`eq` 对数组与对象按 JSON 序列化比较（结构相等）；四个数值比较先把两侧转 `Number`，任一 `NaN` 即 `false`；
`contains` 在左侧既非数组也非字符串时为 `false`；一个 condition 里写了多个比较词时是 **AND**。

---

## 3. `visible`：条件数组

`visible` 是**数组，AND 语义**。任一项为假则该元素**完全不渲染**（不是 `display:none`），子树也不构建；
不写视为恒真。

```json
"helper": {
  "type": "HelperText",
  "props": { "text": "邮箱格式不对", "error": true },
  "visible": [{ "$state": "/touched/email", "truthy": true },
              { "$state": "/form/email", "contains": "@", "not": true }]
}
```

---

## 4. `watch`：路径变化触发动作

`watch` 是元素顶层字段，形状是「路径 → 作业」：

```json
"country": {
  "type": "Select",
  "props": { "value": { "$bindState": "/form/country" }, "options": [ … ] },
  "watch": { "/form/country": { "action": "loadCities", "params": { "country": { "$state": "/form/country" } } } }
}
```

被观察路径的值**发生变化**时派发 `action`，`params` 递归求值后交给 handler。**首帧只登记快照不触发**
（实现按 `元素id + 路径` 存 `JSON.stringify` 结果，与上一帧相同就跳过），所以把 `undefined` 改成 `null`
也会触发一次。

---

## 5. 动作（actions）

props 里写 `"action": "<name>"` 与 `"actionParams": { … }`。派发时机：`button` / `a.button` /
`button.chip` / `button.link` / `button.tab-item` 的 **click**；`input` 的 **change**；
`checkbox` / `radio` / `switch` / `file-input` / `card-option` 的 **change**。`params` 派发前递归求值。

**内建 `setState`**：`actionParams` 为 `{ "statePath": "/ui/showTip", "value": true }`，`value` 支持表达式。
派发等价于 `controller.set(statePath, 求值结果)`（写 state → 整树重渲染 → 调 `onChange`）。只有
`statePath` 是非空字符串时才算 `handled: true`，否则退化成未处理动作（不抛异常）。

**其它名字**交给 `opts.handlers[name](params, ctx)`。`ctx` 只有 4 个成员：`getState()` 返回整个 state、
`get(path)` 读一个路径、`set(path, value)` 写路径并触发重渲染、`log` 是动作日志数组本身（只读使用）。
**未注册的名字不抛异常**，照常记一条 `handled: false` 的日志——spec 可能由 LLM 生成，不能因为一个未知
动作名就让整页白屏。

每次派发（含未处理的）都追加一条日志 entry：`at`（`Date.now()` 毫秒时间戳）、`name`（动作名）、
`params`（已求值参数）、`handled`（是否被 `setState` 或某个 handler 消费）。
`controller.getActionLog()` 返回**副本**（`slice()`），调用方可放心 `reverse()` / 排序。

---

## 6. `validate`：交付前自查

`AIHtml.validate(spec)` 返回 `{ ok: boolean, errors: string[] }`，`ok` 为真当且仅当 `errors.length === 0`。
错误信息单行、含元素 id、不含引号，逐条检出：

```
spec is not an object
spec.elements is missing or not an object
spec.root is missing
root element <id> is not in spec.elements
element <id> is not an object
element <id> has no type
element <id> has unknown component type <type>
element <id> props is not an object
element <id> children is not an array
element <id> references missing child <id>
element <id> visible is not an array
element <id> watch is not an object
children cycle detected <a> -> <b> -> <a>
```

`validate` **不做** class / 色值检查，也不校验修饰组合是否合法（不合法的 `variant` 被静默丢弃，见 §8）。

---

## 7. runtime API

### 7.1 全局 `window.AIHtml`（runtime 只暴露这一项）

| 成员 | 返回 |
| --- | --- |
| `version` | 只读字符串，当前 `"1.0.0"` |
| `catalog` | `{ "<Type>": { description: string, props: [{ name, type, description }] } }`，31 个 key |
| `prompt()` | `string`：由 catalog 生成的系统提示——可用组件清单（type + description + 每个 prop 的名/类型/说明）、spec 结构说明、全部表达式语法、`visible` 与 `setState` 示例、「只能用清单内组件」的硬约束句。用途是塞进 LLM 的 system prompt |
| `validate(spec)` | `{ ok: boolean, errors: string[] }`，见 §6 |
| `render(spec, mount, opts)` | `controller`，见 §7.2 |

`opts` 全部可选：`state`（初始 state，缺省 `{}`）、`handlers`（名字 → 函数）、`functions`（`$computed` 用）、
`onAction(entry)`、`onChange(state)`。`spec` 不是对象时退化为 `{ root: "", elements: {} }`。

### 7.2 `controller`

| 方法 | 返回与副作用 |
| --- | --- |
| `getState()` | state 对象本身（**同一引用**，不是副本）；直接改它不触发重渲染，要用 `set` |
| `get(path)` | 该 JSON Pointer 路径的值，不存在返回 `undefined` |
| `set(path, value)` | `undefined`。写 state（`value` **不再求值**，表达式要在 props 里先求好）→ 整树重渲染 → 调 `onChange(state)`；中间段缺失时按下一段是否数字决定建数组还是对象 |
| `setSpec(spec)` | `undefined`。换一份 spec 并重渲染，**state 保留**；非对象的 spec 退化为空 spec |
| `getActionLog()` | `Array<{at, name, params, handled}>` 的**副本**，按派发先后升序 |
| `dispatch(name, params)` | 手动派发，返回那条日志 entry；`params` 非对象时按 `{}` 处理 |
| `destroy()` | `undefined`。置 `dead`、清空日志、`mount.replaceChildren()` 清空挂载点；**之后 `set` / `setSpec` 都是 no-op** |

### 7.3 渲染算法行为

- **同步首屏**：`render()` 返回时 DOM 已完整挂载，无 `setTimeout` / `requestAnimationFrame` / `Promise`
  参与首帧。这是门禁用 `--dump-dom` 抓快照能稳定拿到完整 DOM 的前提。
- **整树重建**：任何 state 变化都从 root 重新深度优先建树，再 `mount.replaceChildren(新树)`，没有 key
  复用与局部 patch（代价见 §10.2 第 4 条）。
- **重入保护**：渲染中再次触发 `set` 不递归，而是置「再来一轮」标记，本轮结束后补一次，上限 20 轮。
- **降级不崩**：未知 `type`、`children` 引用不存在的 id、`children` 成环，都在该位置插入
  `<div class="callout destructive"><p>错误说明</p></div>` 并**继续渲染其余节点**；`root` 缺失或不在
  `elements` 里时整个 mount 被替换为一个这样的错误框。
- **焦点与光标保持**：重渲染前若 `document.activeElement` 在 mount 内且带 `data-ai-bind` 路径，记下路径、
  `value`、`selectionStart` / `selectionEnd` / `selectionDirection`；重渲染后按同一路径找回控件 `focus()`，
  `input` / `textarea` 再 `setSelectionRange(...)` 还原光标，radio 额外按 `value` 匹配。数字 / 日期类输入
  在部分浏览器上禁止设选区，该异常被吞掉，其余流程照常。
- **XSS**：文本一律 `textContent` 赋值，**没有任何 `innerHTML`**；图标 sprite 由宿主页静态写死。
- **`watch` 时机**：每轮重渲染**之后**检查一次快照。

### 7.4 表单控件绑定

只有这 8 项接受 `$bindState`，且只能写在对应 prop 上：

| type | 写在 | 事件 | 写回 state 的值 |
| --- | --- | --- | --- |
| `Input` | `value` | `input` | 字符串；`type: "number"` 时转 `Number`（空串写回 `""`） |
| `Textarea` | `value` | `input` | 字符串 |
| `Select` | `value` | `change` | 选中 `option` 的 `value` 字符串 |
| `Checkbox` | `checked` | `change` | 布尔 |
| `Switch` | `checked` | `change` | 布尔 |
| `Radio` | `checked` | `change` | **本项的 `value` 字符串**；同 `name` 分组互斥 |
| `CardOption` | `checked` | `change` | `control: "checkbox"` 写布尔，`"radio"` 写本项 `value` |
| `Dialog` | `open` | 原生 `close` | 恒为 `false` |

其它 type 的 prop 里写 `$bindState` 只会当普通读值。被绑定的控件额外带 `data-ai-bind="<路径>"`——这是焦点
恢复与外部定位的钩子，不是公开 API。

---

## 8. 31 个组件 type 与 props

修饰词是运行时查表，**不在表里的值被静默丢弃、不抛异常**：`button` 只认 `secondary` `tertiary` `shy`，
`link` 只认 `seamless` `passive`，`callout` 只认 `info` `success` `warning` `destructive`，`progress` 只认
`circular` `skeleton`，`file-input` 只认 `secondary` `tertiary` `shy`。所以 `variant: "primary"` 等价于
不写 `variant`——默认按钮样式本来就是主色实心。

| type | 渲染成 | props（括号内是默认值） |
| --- | --- | --- |
| `Stack` | `div` + 内联 `display:flex` | `direction` row\|column（column）、`gap`（`var(--sui-base-padding)`）、`align`→align-items、`justify`→justify-content、`wrap` bool |
| `Grid` | `div` + 内联 `display:grid` | `columns` 数字→`repeat(N,minmax(0,1fr))`／字符串→原样、`minWidth`→`repeat(auto-fit,minmax(W,1fr))`、`gap` |
| `Card` | `div.card` / `a.card` / `button.card` | `as` div\|a\|button（div）、`href`、`action`、`actionParams` |
| `Fieldset` | `fieldset.fieldset` + `legend.legend` | `legend`（也收 `title`）、`error` bool（加在 legend 上） |
| `Divider` | `hr`，无 class | 无 |
| `KeyValue` | `dl.key-value card` + 内联 padding | `items`（`{label,value}` 数组，裸字符串则 label=字符串、value=""）、`padding`（`12px`） |
| `Heading` | `h1`–`h4`，无 class | `level` 1..4（2，越界钳制）、`text`（也收 `title`） |
| `Text` | `p`，无 class | `text`（也收 `content`） |
| `Chip` | `button` / `span` / `a` + `.chip` | `label`、`active` bool、`as` button\|span\|a、`href` 非空即 `a`、`action`、`actionParams` |
| `Callout` | `div.callout` + 语义修饰 | `variant` info\|success\|warning\|destructive、`title`→`<strong>`、`text`、`icon`→sprite 名 |
| `Link` | `a.link` / `button.link` | `text`、`href`、`variant` seamless\|passive、`as` a\|button（a）、`action`、`actionParams` |
| `Icon` | `svg.icon` + `<use href="#ai-icon-…">` | `name`、`size`→内联宽高 |
| `Button` | `button.button` / `a.button` | `label`、`variant` secondary\|tertiary\|shy（省略即主色）、`href` 非空即 `a`、`disabled`、`loading`（加 `disabled` 并插 `progress.circular`）、`icon`、`action`、`actionParams` |
| `Input` | `input.input` + `.error` | `value`（值或 `$bindState`）、`type`（其余按 text）、`placeholder`、`name`、`id`、`disabled`、`error`、`action`（change）、`actionParams` |
| `Textarea` | `textarea.textarea` + `.error` | `value`、`rows`（4）、`placeholder`、`name`、`id`、`disabled`、`error` |
| `Select` | `select.select` + `.error` | `options`（`{value,label,disabled?}` 或裸字符串）、`value`、`name`、`id`、`disabled`、`error` |
| `Checkbox` | `label.label` > `input.checkbox` | `label`、`checked`、`name`、`id`、`disabled`、`error`（`label` 与 `input` 都加）、`action`、`actionParams` |
| `Radio` | `label.label` > `input.radio` | `label`、`name`（同组同名）、`value`、`checked`、`disabled`、`error`、`action`、`actionParams` |
| `Switch` | `label.label`（文字在前）> `input.switch` | `label`、`checked`、`name`、`disabled`、`error`、`action`、`actionParams` |
| `FileInput` | `label.label` > `input.file-input` | `label`、`accept`、`multiple`、`variant` secondary\|tertiary\|shy、`dragover`、`disabled`、`error`、`action`、`actionParams` |
| `CardOption` | `label.card-option` > `input` | `title`、`description`（`title` 后插 `<br>`）、`control` radio\|checkbox（radio）、`name`、`value`、`checked`、`disabled`、`error` |
| `Table` | `table.table` + `thead` / `tbody` | `columns`（`{key,label}` 对象；给字符串时该字符串同时充当表头与取值 key）、`rows`（对象数组按 key 逐列取值；元素是数组或标量时整行只渲染一个 `td`，内容是该值的 JSON 字符串）、`caption` |
| `Progress` | `progress.progress` | `value`、`max`（100）、`indeterminate` bool、`variant` circular\|skeleton |
| `Meter` | `meter.meter` | `value`、`min`（0）、`max`（100）、`low`、`high`、`optimum` |
| `Details` | `details.details` + `summary` | `summary`（也收 `title`）、`open` bool→`open` 属性 |
| `TabItem` | `button.tab-item` / `a.tab-item` | `label`、`active` bool、`href` 非空即 `a`、`action`、`actionParams` |
| `MenuItem` | `ul.card`（内联 `list-style:none;margin:0;padding:0`）> `li` > `button`/`a.menu-item` | `label`、`active`、`href`、`action`、`actionParams` |
| `Dialog` | `dialog.dialog` + `modal`\|`popover` + 可选 `anchor_*` + `form[method=dialog]` 里的关闭按钮 | `open`（bool 或 `$bindState`）、`mode` modal\|popover（modal）、`anchor` left\|right\|top\|bottom、`title`、`closeLabel`（`关闭`） |
| `Label` | `label.label` + `.error` | `text`（也收 `label`）、`for`、`error` |
| `Legend` | `legend.legend` + `.error` | `text`、`error` |
| `HelperText` | `p.helper-text` + `.error` | `text`、`error` |

`Input.type` 接受 `text` `number` `email` `password` `search` `tel` `url` `datetime-local`，其余按 `text`。
`Dialog` 自带的 `form[method=dialog]` 永远排在 children **之后**；`Input` / `Textarea` / `Select` /
`Progress` / `Meter` / `Icon` / `Divider` / `MenuItem` 是 void 或内容完全由 props 决定，`children` 被忽略。

---

## 9. 缺陷修复记录（headless 探针实测 → 已修）

以下 7 条是开发过程中实测出的**真实缺陷**，均已在当前版本修复。保留本表作为回归锚点：
若某天下面这些行为又变回「现象」列，说明修复被改坏了。

| # | 曾经的缺陷 | 当时的现象 | 当前保证的行为 |
| --- | --- | --- | --- |
| a | `Switch` 首帧忽略 `checked` / `$bindState` | 构建函数没给 `input.switch` 赋 `checked`，state 为 `true` 而开关显示未开 | `checked: true` 字面量与 `$bindState` 首帧即生效，与 `Checkbox` / `Radio` 一致 |
| b | `Button` 的 `loading: true` 产出 `class="progress circular icon"` | 多出的 `icon` 让 `.button .icon`（权重 0,2,0）压过 `.progress:where(.circular)`（0,1,0），spinner 从 48px 塌到约 17.6px | 只输出 `progress circular`，实测 `height: 48px` |
| c | `Table` 把 `<caption>` 追加在 `<tbody>` 之后 | caption 渲染在表格底部（HTML 解析器会纠正，`appendChild` 不会） | `caption` 用 `insertBefore(…, firstChild)` 插入，是 `table` 的第一个子元素 |
| d | 每个 `MenuItem` 自建一个 `ul.card` | N 个兄弟 `MenuItem` 渲染成 N 个独立列表容器 | 同一父下连续的 `MenuItem` 复用**同一个** `ul.card`，对齐上游「单 `ul.card` 含多 `li`」 |
| e | `Button` 的 `variant: "primary"` 被静默丢弃 | `prompt()` 宣称支持 `primary`，实现查表里没有它 | catalog 描述已删掉 `primary`，并写明「默认即主按钮样式，无需传值」 |
| f | `FileInput` 的 `error` 没落到包裹 `label` 上 | `Checkbox` / `Radio` / `Switch` 会给 `label` 也加 `error`，`FileInput` 只加在 `input` 上 | `FileInput` 的外层 `label` 同样带 `error` |
| g | 字面量 `open: true` 且无 `$bindState` 的 `Dialog` 会被重渲染重新打开 | 用户点关闭后，任何一次 re-render 又 `showModal()` | 无绑定时不参与 `dialogs` 同步，关得掉 |

> 仍建议给 `Dialog` 的 `open` 写 `$bindState`（这样别的元素能用 `visible` 读到开关状态），
> 但这不再是**正确性要求**，只是状态可读性的选择。

---

## 10. 与真实 `@json-render/*` 库的对应关系与差异

### 10.1 概念映射

左侧是本 runtime 的实现名，右侧是真实库侧对应位置。**右侧名称取自契约列出的符号，本工作区没有联网核对
签名**——接入前必须以真实库的 README 与类型定义为准。

| 本 runtime | 真实库侧对应 | 说明 |
| --- | --- | --- |
| `window.AIHtml.catalog` | `@json-render/core` 的 `defineCatalog` | 组件清单：type 名 → props 定义。本 runtime 用 `{name, type, description}` 三元组，真实库用 zod schema |
| 元素 `type` 字符串 | `@json-render/core` 的 `defineRegistry` 注册的组件名 | 真实库需要「type → React 组件」注册表，本 runtime 用内部查表代替 |
| `AIHtml.render(spec, mount, opts)` | `@json-render/react` 的 `Renderer` 组件 | 真实库是 React 组件（吃 spec 出 React 元素），本 runtime 是命令式函数（吃 spec 出 DOM） |
| props 里的 `$state` / `$cond` / `$template` / `$bindState` / `$computed` | 表达式求值层 | 字段名刻意对齐，便于同一份 spec 平移 |
| `AIHtml.validate` | zod schema 校验 | 本 runtime 只做结构校验（§6），不做逐 prop 类型校验 |
| `actions` / `handlers` | 真实库的动作分发机制 | 本 runtime 只有内建 `setState` + 一个 `handlers` 字典 |
| — | `@json-render/directives` | **本 runtime 不含任何指令包**，见 §10.2 |

### 10.2 本 runtime 不具备的能力

1. **无 SpecStream 流式增量**。上游可把 spec 按流式增量推送并逐段渲染；本 runtime 只接受一份完整 spec，
   `render()` 一次建树，`setSpec()` 整体替换。
2. **无 `@json-render/directives` 指令包**。`$format`（日期 / 数字格式化）、`$math`（算术）、`$concat`
   这类指令全部没有，本 runtime 只有 §2 列出的 5 个表达式；props 的类型约束、默认值、枚举校验也没有，
   非法 `variant` 只是被丢弃。
3. **无真实锚定的 popover**。`Dialog` 的 `anchor` 只是把 `anchor_left` / `anchor_right` / `anchor_top` /
   `anchor_bottom` 打到 class 上作为**定位意图标注**，不做位置计算、不做视口碰撞翻转、不跟随滚动；
   `mode: "popover"` 走原生 `dialog.show()`，非模态、由用户 agent 定位。
4. **无 key 复用与增量 patch**。每次 state 变化整树重建，大 spec 下有性能与滚动位置成本。
5. **无 schema 导出与 TypeScript 类型**。`catalog` 是本 runtime 自有结构，不是 zod schema，也没有
   `import` / `export` / 类型声明（经典 script IIFE 是为了让 `file://` 双击能跑）。映射成 zod schema 的
   做法见 `recipes.md` 升级章节。
6. **无 `$computed` 内置函数库**。必须由调用方通过 `opts.functions` 注册，未注册返回 `undefined`。
