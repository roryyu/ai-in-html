# 可复制的 spec 配方

五个**可直接复制**的完整 JSON spec：落地页 / 仪表盘 / 表单 / 设置页 / 报告页。每节给出初始 `state`、
完整 `spec`、一句话说明。字段语义见 `spec-contract.md`，class 事实面见 `sashimi-catalog.md`。

## 0. 通用前提

宿主页需要三个 vendored CSS、一个 `<div id="app">`、一个内嵌图标 sprite（`examples/spec-driven.html`
是完整模板，直接抄）。渲染入口：

```html
<link rel="stylesheet" href="../vendor/sashimi-ui/default.theme.css">
<link rel="stylesheet" href="../vendor/sashimi-ui/bundle.css">
<script src="../runtime/ai-html.js"></script>
<div id="app"></div>
<script>
var ctl = AIHtml.render(SPEC, document.getElementById("app"), {
  state: STATE,
  handlers: { announce: function (p) { console.log(p.text); } },
  functions: { rate: function (a) { return Math.round(a.n / a.d * 100) + "%"; } }
});
</script>
```

`render()` 同步完成首屏，无需等 `DOMContentLoaded`；交付前自查 `AIHtml.validate(SPEC).ok`，为假时读 `errors`。

`spec-contract.md` §9 列的 7 条缺陷已全部修复，所以下面这些能力现在都可以直接用：
`Switch` 的 `checked` / `$bindState` 首帧生效；`Button` 的 `loading: true` 能正常出 48px spinner；
`Table` 可以写 `caption`；一份 spec 里可以放任意多个兄弟 `MenuItem`；`FileInput` 的 `error`
会同时作用于外层 `label`；`Dialog` 写死 `open: true` 也关得掉。
本文件的配方为了保持最小可读性，没逐个展示这些能力，不是因为它们不可用。

---

## 1. 落地页（landing）

主视觉 + 两张特性卡 + 一条 `visible` 条件提示。演示 `$template`、`visible`、`setState`。

state：`{ "ui": { "showTip": false }, "app": { "name": "ai-html", "visits": 12840 } }`

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "props": { "direction": "column", "gap": "16px" }, "children": ["hero", "cards", "note"] },
    "hero": { "type": "Card", "children": ["h1", "row", "tip"] },
    "h1": { "type": "Heading", "props": { "level": 1, "text": "一次对话，一份可渲染的 HTML" } },
    "row": { "type": "Stack", "props": { "direction": "row", "gap": "var(--sui-icon-gap)", "align": "center" }, "children": ["cta", "ver"] },
    "cta": { "type": "Button", "props": { "label": "看看条件提示", "icon": "arrow-forward", "action": "setState", "actionParams": { "statePath": "/ui/showTip", "value": true } } },
    "ver": { "type": "Chip", "props": { "label": "sashimi-ui v2.1.0", "active": true } },
    "tip": { "type": "Callout", "props": { "variant": "info", "icon": "info", "text": "这段文字只有 /ui/showTip 为真时才被构建。" }, "visible": [{ "$state": "/ui/showTip", "truthy": true }] },
    "cards": { "type": "Grid", "props": { "columns": 2 }, "children": ["c1", "c2"] },
    "c1": { "type": "Card", "children": ["c1t"] },
    "c1t": { "type": "Text", "props": { "$template": "${/app/name} 已访问 ${/app/visits} 次。" } },
    "c2": { "type": "Card", "children": ["c2t"] },
    "c2t": { "type": "Text", "props": { "text": "Mode A 零 JavaScript；Mode B 用这份 spec 驱动。" } },
    "note": { "type": "Callout", "props": { "variant": "warning", "text": "间距写内联 style 或 ai- 前缀 class。" } }
  }
}
```

---

## 2. 仪表盘（dashboard）

KPI 键值表 + 配额量表 + 不确定态进度条 + 地区明细表。演示 `$cond` 阈值判断。

state：`{ "metrics": { "visits": 12840, "churn": 2.4, "quota": 62 } }`

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "props": { "direction": "column", "gap": "16px" }, "children": ["head", "kpi", "t"] },
    "head": { "type": "Card", "children": ["h", "sub", "live"] },
    "h": { "type": "Heading", "props": { "level": 2, "text": "运营仪表盘" } },
    "sub": { "type": "Text", "props": { "$template": "访问 ${/metrics/visits} · 流失率 ${/metrics/churn}" } },
    "live": { "type": "Chip", "props": { "label": "实时", "active": true } },
    "kpi": { "type": "Grid", "props": { "columns": 2 }, "children": ["kv", "quota"] },
    "kv": { "type": "KeyValue", "props": { "items": [
      { "label": "访问量", "value": { "$state": "/metrics/visits" } },
      { "label": "流失率", "value": { "$cond": { "$state": "/metrics/churn", "gt": 2 }, "$then": "偏高", "$else": "正常" } }
    ] } },
    "quota": { "type": "Card", "children": ["meter", "prog"] },
    "meter": { "type": "Meter", "props": { "value": { "$state": "/metrics/quota" }, "min": 0, "max": 100, "low": 20, "high": 80, "optimum": 100 } },
    "prog": { "type": "Progress", "props": { "indeterminate": true } },
    "t": { "type": "Table", "props": { "columns": [{ "key": "region", "label": "地区" }, { "key": "pv", "label": "访问量" }], "rows": [
      { "region": "华东", "pv": 5210 }, { "region": "华北", "pv": 4180 }, { "region": "华南", "pv": 3450 }
    ] } }
  }
}
```

表格说明文字要放在表格外面（`Text` 或 `Details`），因为 `Table` 的 `caption` 会被追加到 `tbody` 之后。

---

## 3. 表单（form）

注册表单。演示 `$bindState`、`visible` 双条件错误提示、`watch` 联动。

state：`{ "touched": { "email": false }, "form": { "name": "", "email": "", "country": "cn", "plan": "team", "agree": false } }`

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "props": { "direction": "column", "gap": "16px" }, "children": ["card"] },
    "card": { "type": "Card", "children": ["basic", "plan", "extra"] },
    "basic": { "type": "Fieldset", "props": { "legend": "基本信息" }, "children": ["name", "email", "eErr", "country"] },
    "name": { "type": "Input", "props": { "id": "f-name", "type": "text", "placeholder": "昵称", "value": { "$bindState": "/form/name" } } },
    "email": { "type": "Input", "props": { "id": "f-email", "type": "email", "value": { "$bindState": "/form/email" }, "error": { "$cond": { "$state": "/touched/email", "truthy": true }, "$then": true, "$else": false } } },
    "eErr": { "type": "HelperText", "props": { "text": "邮箱还没填，或者缺少 @", "error": true }, "visible": [{ "$state": "/touched/email", "truthy": true }, { "$state": "/form/email", "contains": "@", "not": true }] },
    "country": { "type": "Select", "props": { "id": "f-country", "value": { "$bindState": "/form/country" }, "options": [{ "value": "cn", "label": "中国大陆" }, { "value": "sg", "label": "新加坡" }] }, "watch": { "/form/country": { "action": "loadCities", "params": { "c": { "$state": "/form/country" } } } } },
    "plan": { "type": "Fieldset", "props": { "legend": "套餐" }, "children": ["pTeam", "pSolo", "agree"] },
    "pTeam": { "type": "Radio", "props": { "name": "plan", "value": "team", "label": "团队版", "checked": { "$bindState": "/form/plan" } } },
    "pSolo": { "type": "Radio", "props": { "name": "plan", "value": "solo", "label": "个人版", "checked": { "$bindState": "/form/plan" } } },
    "agree": { "type": "Checkbox", "props": { "label": "我已同意服务条款", "checked": { "$bindState": "/form/agree" } } },
    "extra": { "type": "Stack", "props": { "direction": "row", "gap": "var(--sui-icon-gap)", "align": "center" }, "children": ["submit", "touch"] },
    "submit": { "type": "Button", "props": { "label": "提交", "icon": "check", "action": "announce", "actionParams": { "text": "已提交（演示）" } } },
    "touch": { "type": "Button", "props": { "label": "标记邮箱已填写", "variant": "tertiary", "action": "setState", "actionParams": { "statePath": "/touched/email", "value": true } } }
  }
}
```

`watch` 需要注册 handler：`loadCities: function (p) { console.log("拉取城市", p.c); }`。
需要文件上传时加 `FileInput`，但错误提示挂 `HelperText` 而不是指望它的 label 变红：
`{ "type": "FileInput", "props": { "label": "上传头像", "accept": "image/*", "variant": "secondary" } }`

---

## 4. 设置页（settings）

两个页签 + 三块按 `visible` 切换的面板 + 一个受控 Dialog。演示 `$cond` 驱动 `active`。

state：`{ "tab": "profile", "dialog": false, "profile": { "name": "指挥官" }, "notify": { "email": true } }`

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "props": { "direction": "column", "gap": "16px" }, "children": ["tabs", "pProfile", "pSecurity", "pBilling", "actions", "dlg"] },
    "tabs": { "type": "Stack", "props": { "direction": "row", "gap": "var(--sui-label-gap)" }, "children": ["tProfile", "tSecurity"] },
    "tProfile": { "type": "TabItem", "props": { "label": "资料", "active": { "$cond": { "$state": "/tab", "eq": "profile" }, "$then": true, "$else": false }, "action": "setState", "actionParams": { "statePath": "/tab", "value": "profile" } } },
    "tSecurity": { "type": "TabItem", "props": { "label": "安全", "active": { "$cond": { "$state": "/tab", "eq": "security" }, "$then": true, "$else": false }, "action": "setState", "actionParams": { "statePath": "/tab", "value": "security" } } },
    "pProfile": { "type": "Card", "visible": [{ "$state": "/tab", "eq": "profile" }], "children": ["pn", "ph"] },
    "pn": { "type": "Input", "props": { "id": "s-name", "type": "text", "value": { "$bindState": "/profile/name" } } },
    "ph": { "type": "HelperText", "props": { "text": "名称只影响本地显示。" } },
    "pSecurity": { "type": "Card", "visible": [{ "$state": "/tab", "eq": "security" }], "children": ["cbMail"] },
    "cbMail": { "type": "Checkbox", "props": { "label": "邮件通知", "checked": { "$bindState": "/notify/email" } } },
    "pBilling": { "type": "Card", "visible": [{ "$state": "/tab", "eq": "billing" }], "children": ["kv"] },
    "kv": { "type": "KeyValue", "props": { "items": [{ "label": "套餐", "value": "团队版" }, { "label": "席位", "value": "6" }] } },
    "actions": { "type": "Stack", "props": { "direction": "row", "gap": "var(--sui-icon-gap)", "align": "center" }, "children": ["about", "menu"] },
    "about": { "type": "Button", "props": { "label": "关于", "variant": "secondary", "icon": "info", "action": "setState", "actionParams": { "statePath": "/dialog", "value": true } } },
    "menu": { "type": "MenuItem", "props": { "label": "导出设置 JSON", "active": true, "action": "announce", "actionParams": { "text": "导出占位" } } },
    "dlg": { "type": "Dialog", "props": { "open": { "$bindState": "/dialog" }, "title": "关于 ai-html" }, "children": ["dlgText"] },
    "dlgText": { "type": "Text", "props": { "text": "open 为 true 时 showModal()，原生 close 事件把绑定路径写回 false。" } }
  }
}
```

`pBilling` 常态不可见（当前 spec 只有两个页签），可再加一个指向 `billing` 的 `TabItem`。
`mode: "popover"` 也能用（走 `show()`），但 `anchor: "bottom"` 只在 class 上标注 `anchor_bottom`，
**不做真实定位**——需要锚定 popover 请自己算位置或换真实库。

---

## 5. 报告页（report）

一份周报：摘要键值表 + 完成率 + 分项表格 + 折叠明细。演示 `$computed`。

state：`{ "week": { "label": "第 42 周" }, "tasks": { "done": 37, "total": 44 } }`

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "props": { "direction": "column", "gap": "16px" }, "children": ["h", "sub", "summary", "bar", "rows"] },
    "h": { "type": "Heading", "props": { "level": 1, "text": "工程周报" } },
    "sub": { "type": "Text", "props": { "$template": "${/week/label} · 覆盖 runtime、playground 与 docs" } },
    "summary": { "type": "KeyValue", "props": { "items": [
      { "label": "已完成", "value": { "$state": "/tasks/done" } },
      { "label": "结余", "value": { "$cond": { "$state": "/tasks/done", "lt": 40 }, "$then": "偏紧", "$else": "充裕" } }
    ] } },
    "bar": { "type": "Stack", "props": { "direction": "column", "gap": "var(--sui-label-gap)" }, "children": ["barVal", "prog", "meter"] },
    "barVal": { "type": "Text", "props": { "text": { "$computed": "rate", "args": { "n": { "$state": "/tasks/done" }, "d": { "$state": "/tasks/total" } } } } },
    "prog": { "type": "Progress", "props": { "value": 84, "max": 100 } },
    "meter": { "type": "Meter", "props": { "value": 72, "min": 0, "max": 100, "low": 20, "high": 80, "optimum": 100 } },
    "rows": { "type": "Card", "children": ["t", "details", "cap"] },
    "t": { "type": "Table", "props": { "columns": [{ "key": "mod", "label": "模块" }, { "key": "status", "label": "状态" }], "rows": [
      { "mod": "runtime", "status": "已交付" }, { "mod": "playground", "status": "已交付" }, { "mod": "docs", "status": "进行中" }
    ] } },
    "details": { "type": "Details", "props": { "summary": "风险与待办", "open": true }, "children": ["cap"] },
    "cap": { "type": "Text", "props": { "text": "Table 的 columns 要用 {key,label}、rows 要用同 key 的对象，才能逐列取值。" } }
  }
}
```

`$computed` 的 `rate` 注册在 `functions` 里，未注册返回 `undefined` 而不是报错：

```js
functions: { rate: function (a) { return Math.round(a.n / a.d * 100) + "%（" + a.n + " / " + a.d + "）"; } }
```

**不要把 `$computed` 嵌进 `$template`**：`$template` 只对 `${/state/path}` 做路径查表，`${}` 里写表达式对象
会得到空串。要组合就并列成两个元素，像上面 `summary` 与 `barVal` 那样。

---

## 6. 升级到真实 json-render 库

本 runtime 是**契约子集的独立实现**，不是 `@json-render/*` 的代码；搬迁要装包、声明 catalog、把 type
映射到 React 组件。下面包名与 `defineCatalog` / `defineRegistry` / `Renderer` 三个符号取自契约 §9.3，
**本工作区没有联网能力，未核对过它们的真实签名与导出名**，接入前请以真实库的 README 与类型定义为准。

### 6.1 安装

```bash
npm install @json-render/core @json-render/react react react-dom
npm install sashimi-ui@2.1.0
npm install @json-render/directives zod   # 指令包（格式化 / 算术 / 拼接），本 runtime 没有
```

React 侧引 sashimi-ui 的 CSS（jsDelivr，版本锁 2.1.0）：`default.theme.css` 必须先加载。

### 6.2 把 `AIHtml.catalog` 映射成 zod schema

catalog 里每个 prop 是 `{ name, type, description }` 三元组，`type` 是 `string` / `number` / `boolean` /
`object` / `array` 这样的**说明性标签**，不是运行时 schema：

```js
import { z } from "zod";
import { defineCatalog } from "@json-render/core";

const zodOf = (t) => t === "number" ? z.number() : t === "boolean" ? z.boolean()
  : t === "object" ? z.record(z.string(), z.unknown()) : t === "array" ? z.array(z.unknown())
  : z.string();   // "string 或 $bindState" 之类无法归类的都落到 z.string()
const schemaOf = (def) => z.object(Object.fromEntries(def.props.map((p) => [p.name, zodOf(p.type).optional()])));

export const catalog = defineCatalog(Object.fromEntries(
  Object.entries(AIHtml.catalog).map(([type, def]) => [type, { props: schemaOf(def) }])));
```

两点：所有 prop 都 `.optional()`（本 runtime 一律按缺省值兜底）；表达式所在位置由真实库的 directives 层
处理，schema 不该禁止它们出现在值位置。

### 6.3 注册组件（`defineRegistry`）

真实库需要「type → React 组件」注册表；纯 CSS 模式下组件就是把 props 翻译成 sashimi class：

```jsx
import { defineRegistry } from "@json-render/core";
const cls = (...xs) => xs.filter(Boolean).join(" ");

export const registry = defineRegistry({
  Stack: ({ direction = "column", gap = "var(--sui-base-padding)", align, justify, wrap, children }) =>
    <div style={{ display: "flex", flexDirection: direction, gap, alignItems: align,
                  justifyContent: justify, flexWrap: wrap ? "wrap" : undefined }}>{children}</div>,
  Button: ({ label, variant, disabled, children, ...rest }) =>
    <button className={cls("button", variant)} disabled={disabled} {...rest}>{children ?? label}</button>,
  Card: ({ children }) => <div className="card">{children}</div>,
  Text: ({ text }) => <p>{text}</p>
  // …其余 27 个 type 同理；cls() 保证只产出 sashimi-catalog.md §2 白名单里的 class
});
```

`variant` 只传 `secondary` / `tertiary` / `shy`（`primary` 不传），`callout` 传 `info` / `success` /
`warning` / `destructive`，与 `sashimi-catalog.md` §3 的矩阵一一对应。

### 6.4 用 `Renderer` 渲染

```jsx
import { Renderer } from "@json-render/react";
import landing from "./landing.spec.json";

export default function App() {
  return <Renderer catalog={catalog} registry={registry} spec={landing} initialState={{ app: { visits: 0 } }} />;
}
```

搬迁要改的只有三处：**props 名不变**（本 runtime 刻意对齐）、`visible` / `watch` / `action` 换成真实库的
同名字段、schema 从 §6.2 生成。`$computed` 这类需要函数的表达式在真实库里由 directives 或自定义解析层提供。

### 6.5 sashimi-ui 在 React 下的两种用法

| 模式 | 做法 | 适用 |
| --- | --- | --- |
| 纯 CSS class | 只引 `default.theme.css` + `bundle.css`，写 `<button className="button secondary">` | 与本文档一致；无额外依赖；SSR / 静态导出友好 |
| `sashimi-ui/react` 组件 | 从 `sashimi-ui/react` 导入组件，prop 用组件自己的名字 | 需要组件自带无障碍属性与受控值语义；prop 名与 class 名**不是一一对应**，以该包类型定义为准 |

两种模式可混用（容器与布局走纯 class，交互密集的控件走组件），但**不要**给同一个元素同时加组件和手工
class，样式会叠加出预期外的结果。
