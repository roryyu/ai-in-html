/*!
 * ai-html runtime 1.0.0 — 零依赖 spec -> DOM 渲染器（经典 script，非 ES module）
 * 契约：.verify/ai-html/gen-prompt.txt §2 技术约束 / §4 spec 契约 / §5 runtime 契约
 * class 只用 sashimi-ui 白名单，修饰组合按 §3.3 收敛（button 无 destructive，active 仅 chip/tab-item/menu-item）。
 * render() 同步完成首屏：返回时 DOM 已挂载，无 setTimeout / rAF / Promise。
 */
(function (window) {
"use strict";

var VERSION = "1.0.0";
// SVG 命名空间常量，仅供 createElementNS 使用，不是网络资源引用。
var SVG_NS = "http://www.w3.org/2000/svg";

/* ---- 通用小工具 ---- */
function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function obj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function cx() {
  var a = [], i;
  for (i = 0; i < arguments.length; i++) if (arguments[i]) a.push(String(arguments[i]));
  return a.join(" ");
}
function h(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}
function at(n, map) {
  for (var k in map) {
    var v = map[k];
    if (v === undefined || v === null || v === false) continue;
    n.setAttribute(k, v === true ? "" : String(v));
  }
  return n;
}
function pick(o, keys, dflt) {
  for (var i = 0; i < keys.length; i++) if (o[keys[i]] !== undefined && o[keys[i]] !== null) return o[keys[i]];
  return dflt;
}
function s(v) {
  if (v === undefined || v === null) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
function j(v) {
  try { return JSON.stringify(v === undefined ? null : v); } catch (e) { return String(v); }
}
function txt(v) { return document.createTextNode(s(v)); }
function label(o) { return s(pick(o, ["label", "text"], "")); }
// 合法修饰词查表：白名单外的 variant 一律丢弃，避免造出非法 class 组合。
function mod(map, v) { return v !== undefined && v !== null && own(map, v) ? String(v) : null; }
function icon(name, extra) {
  var svg = document.createElementNS(SVG_NS, "svg"), use = document.createElementNS(SVG_NS, "use");
  svg.setAttribute("class", cx("icon", extra));
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", "#ai-icon-" + s(name));
  svg.appendChild(use);
  return svg;
}
function para(title, body) {
  var p = h("p");
  if (title !== undefined && title !== null && title !== "") {
    p.appendChild(h("strong", null, title));
    p.appendChild(txt(" "));
  }
  p.appendChild(txt(body));
  return p;
}
// 未知类型 / 悬空引用 / children 成环的统一降级出口：可见错误框，渲染继续。
function errBox(msg) {
  var box = h("div", "callout destructive");
  box.appendChild(h("p", null, msg));
  return box;
}

/* ---- JSON Pointer（/a/b/0/c） ---- */
function segs(path) {
  if (typeof path !== "string") return [];
  var t = path.replace(/^\/+/, "");
  return t ? t.split("/").map(function (x) { return x.replace(/~1/g, "/").replace(/~0/g, "~"); }) : [];
}
function pget(state, path) {
  var p = segs(path), cur = state;
  for (var i = 0; i < p.length; i++) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[p[i]];
  }
  return cur;
}
function pset(state, path, value) {
  var p = segs(path), cur = state;
  if (!p.length) return;
  for (var i = 0; i < p.length - 1; i++) {
    if (!obj(cur[p[i]]) && !Array.isArray(cur[p[i]])) cur[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {};
    cur = cur[p[i]];
  }
  cur[p[p.length - 1]] = value;
}

/* ---- 组件目录（31 个 type） ----
 * DSL 每行一个类型：类型 描述|prop:类型:说明|prop:类型:说明
 * 分隔符是 | 与 :，所以说明文字里不写这两个符号，「或」用中文写。
 */
var DSL = [
"Stack flex 容器，渲染 div 内联 flex|direction:string:row 或 column，默认 column|gap:string:默认 var(--sui-base-padding)|align:string:align-items|justify:string:justify-content|wrap:boolean:允许换行",
"Grid grid 容器，渲染 div 内联 grid|columns:number/string:列数或 grid-template-columns|minWidth:string:列宽，生成 auto-fit|gap:string:默认 var(--sui-base-padding)",
"Card 卡片，渲染 div.card / a.card / button.card|as:string:div，a 或 button|href:string:as 为 a 时的链接|action:string:as 为 button 的动作名|actionParams:object:动作参数",
"Fieldset 控件分组，渲染 fieldset 与 legend|legend:string:图例文字|error:boolean:图例加 error",
"Divider 分隔线，渲染 hr，无 class",
"KeyValue 键值表，渲染 dl.key-value card|items:array:每项 label 与 value|padding:string:内边距，默认 12px",
"Heading 标题，渲染 h1 到 h4，无 class|level:number:1 到 4，默认 2|text:string:标题文字",
"Text 段落，渲染 p，无 class|text:string:段落文字",
"Chip 标签，渲染 button / span / a.chip|label:string:标签文字|active:boolean:选中态，加 active|as:string:button，span 或 a|href:string:非空时渲染 a.chip|action:string:点击动作名|actionParams:object:动作参数",
"Callout 提示框，渲染 div.callout 加语义修饰|variant:string:info success warning destructive|title:string:标题，渲染 strong|text:string:正文|icon:string:sprite 符号名",
"Link 链接，渲染 a.link 或 button.link|text:string:链接文字|href:string:链接目标|variant:string:seamless 或 passive|as:string:a 或 button|action:string:动作名|actionParams:object:动作参数",
"Icon 图标，渲染 svg.icon 引用内嵌 sprite|name:string:sprite 符号名|size:string:内联宽高",
"Button 按钮，渲染 button.button 或 a.button|label:string:按钮文字|variant:string:secondary tertiary shy，默认即主按钮样式，无需传值|href:string:非空时渲染 a.button|disabled:boolean:禁用|loading:boolean:显示圆形进度并禁用|icon:string:sprite 符号名|action:string:点击动作名|actionParams:object:动作参数",
"Input 单行输入，渲染 input.input|value:string 或 $bindState:值或绑定路径|type:string:text number email password search tel url datetime-local|placeholder:string:占位文字|name:string:原生 name|id:string:原生 id|disabled:boolean:禁用|error:boolean:错误态加 error|action:string:change 动作名|actionParams:object:动作参数",
"Textarea 多行输入，渲染 textarea.textarea|value:string 或 $bindState:值或绑定路径|rows:number:可见行数，默认 4|placeholder:string:占位文字|name:string:原生 name|id:string:原生 id|disabled:boolean:禁用|error:boolean:错误态加 error",
"Select 下拉选择，渲染 select.select|options:array:每项 value 与 label|value:string 或 $bindState:选中值或绑定路径，state 存字符串|name:string:原生 name|id:string:原生 id|disabled:boolean:禁用|error:boolean:错误态加 error",
"Checkbox 复选框，渲染 label 包裹 input.checkbox|label:string:控件右侧文字|checked:boolean 或 $bindState:勾选状态或绑定路径|name:string:原生 name|id:string:原生 id|disabled:boolean:禁用|error:boolean:错误态加 error|action:string:change 动作名|actionParams:object:动作参数",
"Radio 单选框，渲染 label 包裹 input.radio，同 name 分组|label:string:控件右侧文字|name:string:原生 name，同名同组|value:string:本项的值|checked:boolean 或 $bindState:state 存被选中的 value|disabled:boolean:禁用|error:boolean:错误态加 error|action:string:change 动作名|actionParams:object:动作参数",
"Switch 开关，渲染 label 包裹 input.switch，文字在前|label:string:控件左侧文字|checked:boolean 或 $bindState:开关状态或绑定路径|name:string:原生 name|disabled:boolean:禁用|error:boolean:错误态加 error",
"FileInput 文件选择，渲染 label 包裹 input.file-input|label:string:控件右侧文字|accept:string:accept 属性|multiple:boolean:允许多选|variant:string:secondary tertiary shy|dragover:boolean:加 dragover|disabled:boolean:禁用|error:boolean:错误态加 error|action:string:change 动作名|actionParams:object:动作参数",
"CardOption 卡片式选项，渲染 label.card-option|title:string:标题，渲染 strong|description:string:描述，在 br 之后|control:string:radio 或 checkbox|name:string:原生 name|value:string:本项的值|checked:boolean 或 $bindState:选中状态或绑定路径|disabled:boolean:禁用|error:boolean:错误态加 error",
"Table 表格，渲染 table.table|columns:array:每项列名，或 key 与 label|rows:array:对象数组，按列 key 取值|caption:string:表格说明",
"Progress 进度条，渲染 progress.progress|value:number:当前进度|max:number:最大值，默认 100|indeterminate:boolean:不确定态|variant:string:circular 或 skeleton",
"Meter 量表，渲染 meter.meter|value:number:当前值|min:number:最小值，默认 0|max:number:最大值，默认 100|low:number:低端阈值|high:number:高端阈值|optimum:number:最佳值",
"Details 折叠面板，渲染 details 与 summary|summary:string:折叠标题|open:boolean:设置 open 属性",
"TabItem 页签，渲染 button.tab-item 或 a.tab-item|label:string:页签文字|active:boolean:当前页签，加 active|href:string:非空时渲染 a.tab-item|action:string:动作名，常配 setState|actionParams:object:动作参数",
"MenuItem 菜单项，渲染 ul.card 内的 button.menu-item|label:string:菜单文字|active:boolean:当前项，加 active|href:string:非空时渲染 a.menu-item|action:string:点击动作名|actionParams:object:动作参数",
"Dialog 对话框，渲染 dialog.dialog 与 form 关闭按钮|open:boolean 或 $bindState:是否打开，close 写回 false|mode:string:modal 走 showModal，popover 走 show|anchor:string:left right top bottom，仅定位意图标注|title:string:可选标题|closeLabel:string:关闭按钮文字",
"Label 表单标签，渲染 label.label|text:string:标签文字|for:string:原生 for|error:boolean:错误态加 error",
"Legend 图例，渲染 legend.legend|text:string:图例文字|error:boolean:错误态加 error",
"HelperText 辅助说明，渲染 p.helper-text|text:string:说明文字|error:boolean:错误态加 error"
];
var CATALOG = {};
DSL.forEach(function (line) {
  var parts = line.split("|"), head = parts.shift().split(" "), def = { description: head.slice(1).join(" "), props: [] };
  parts.forEach(function (item) {
    var kv = item.split(":");
    def.props.push({ name: kv[0], type: kv[1], description: kv.slice(2).join(" ") });
  });
  CATALOG[head[0]] = def;
});

/* ---- 合法修饰组合白名单（契约 §3.3） ---- */
var VARIANT = {
  button: { secondary: 1, tertiary: 1, shy: 1 },
  link: { seamless: 1, passive: 1 },
  callout: { info: 1, success: 1, warning: 1, destructive: 1 },
  progress: { circular: 1, skeleton: 1 },
  file: { secondary: 1, tertiary: 1, shy: 1 }
};
var ANCHOR = { left: "anchor_left", right: "anchor_right", top: "anchor_top", bottom: "anchor_bottom" };
var INPUT_TYPE = {
  text: "text", number: "number", "datetime-local": "datetime-local", email: "email",
  password: "password", search: "search", tel: "tel", url: "url"
};
// 哪些 prop 允许携带 $bindState（决定控件读写的 state 路径）。
var BIND = {
  Input: "value", Textarea: "value", Select: "value", Checkbox: "checked",
  Switch: "checked", Radio: "checked", CardOption: "checked", Dialog: "open"
};
// 承载非法子节点的类型（void 元素 / 内容完全由 props 决定）。
var NO_CHILD = {
  Input: 1, Textarea: 1, Select: 1, Progress: 1, Meter: 1, Icon: 1, Divider: 1, MenuItem: 1
};

/* ---- 控件行为：双向绑定与动作派发 ---- */
function readText(n) { return n.type === "number" ? (n.value === "" ? "" : Number(n.value)) : n.value; }
function bindIn(n, c, read, evts) {
  if (!c.b) return;
  n.setAttribute("data-ai-bind", c.b);
  evts.forEach(function (t) {
    n.addEventListener(t, function () { c.r.setPath(c.b, read(n)); });
  });
}
function act(n, p, c, t) {
  if (typeof p.action !== "string" || !p.action) return;
  n.addEventListener(t, function () { c.r.dispatch(p.action, c.r.ev(p.actionParams || {})); });
}
// 标签包裹型控件的公共外壳（checkbox / radio）
function wrapLabel(p, c, cls, type, read) {
  var box = h("input", cx(cls, p.error && "error"));
  at(box, { type: type, name: p.name, id: p.id, disabled: p.disabled });
  bindIn(box, c, read, ["change"]);
  act(box, p, c, "change");
  return box;
}
function lab(p, box) {
  var w = h("label", cx("label", p.error && "error"));
  w.appendChild(box);
  w.appendChild(txt(label(p)));
  return w;
}
// MenuItem 的 ul.card 包装识别：runtime 里只有 MenuItem 产出 ul.card。
function menuList(n) { return !!n && n.nodeName === "UL" && n.className === "card"; }

/* ---- 31 个组件的构建函数 ---- */
var B = {
"Stack": function (p) {
  var n = h("div");
  n.style.display = "flex";
  n.style.flexDirection = p.direction === "row" ? "row" : "column";
  n.style.gap = p.gap === undefined ? "var(--sui-base-padding)" : s(p.gap);
  if (p.align) n.style.alignItems = s(p.align);
  if (p.justify) n.style.justifyContent = s(p.justify);
  if (p.wrap) n.style.flexWrap = "wrap";
  return n;
},
"Grid": function (p) {
  var n = h("div");
  n.style.display = "grid";
  n.style.gridTemplateColumns = p.columns === undefined || p.columns === null
    ? (p.minWidth ? "repeat(auto-fit, minmax(" + s(p.minWidth) + ", 1fr))" : "")
    : (typeof p.columns === "number" ? "repeat(" + p.columns + ", minmax(0, 1fr))" : s(p.columns));
  n.style.gap = p.gap === undefined ? "var(--sui-base-padding)" : s(p.gap);
  return n;
},
"Card": function (p, c) {
  var tag = p.as === "a" || p.as === "button" ? p.as : "div", n = h(tag, "card");
  if (tag === "a" && p.href) n.setAttribute("href", s(p.href));
  if (tag === "button") {
    if (p.disabled) n.setAttribute("disabled", "");
    act(n, p, c, "click");
  }
  return n;
},
"Fieldset": function (p) {
  var n = h("fieldset", "fieldset");
  n.appendChild(h("legend", cx("legend", p.error && "error"), s(pick(p, ["legend", "title"], ""))));
  return n;
},
"Divider": function () { return h("hr"); },
"KeyValue": function (p) {
  var n = h("dl", "key-value card");
  n.style.padding = p.padding === undefined ? "12px" : s(p.padding);
  (Array.isArray(p.items) ? p.items : []).forEach(function (raw) {
    var it = obj(raw) ? raw : { label: raw, value: "" };
    n.appendChild(h("dt", null, s(it.label)));
    n.appendChild(h("dd", null, s(it.value)));
  });
  return n;
},
"Heading": function (p) {
  var lv = Number(p.level) || 2;
  return h("h" + (lv < 1 ? 1 : lv > 4 ? 4 : lv), null, s(pick(p, ["text", "title"], "")));
},
"Text": function (p) { return h("p", null, s(pick(p, ["text", "content"], ""))); },
"Chip": function (p, c) {
  var tag = p.href || p.as === "a" ? "a" : p.as === "span" ? "span" : "button";
  var n = h(tag, cx("chip", p.active && "active"));
  if (tag === "a" && p.href) n.setAttribute("href", s(p.href));
  if (tag === "button") act(n, p, c, "click");
  n.appendChild(txt(label(p)));
  return n;
},
"Callout": function (p) {
  var n = h("div", cx("callout", mod(VARIANT.callout, p.variant)));
  if (p.icon) n.appendChild(icon(p.icon));
  n.appendChild(para(p.title, p.text));
  return n;
},
"Link": function (p, c) {
  var tag = p.as === "button" ? "button" : "a", n = h(tag, cx("link", mod(VARIANT.link, p.variant)));
  if (tag === "a" && p.href) n.setAttribute("href", s(p.href));
  if (tag === "button") act(n, p, c, "click");
  n.appendChild(txt(label(p)));
  return n;
},
"Icon": function (p) {
  var n = icon(p.name);
  if (p.size) { n.style.width = s(p.size); n.style.height = s(p.size); }
  return n;
},
"Button": function (p, c) {
  var tag = p.href ? "a" : "button", n = h(tag, cx("button", mod(VARIANT.button, p.variant)));
  if (tag === "a") n.setAttribute("href", s(p.href));
  if (p.disabled || p.loading) n.setAttribute("disabled", "");
  if (p.loading) n.appendChild(h("progress", "progress circular"));
  if (p.icon) n.appendChild(icon(p.icon));
  n.appendChild(txt(label(p)));
  if (tag === "button") act(n, p, c, "click");
  return n;
},
"Input": function (p, c) {
  var n = h("input", cx("input", p.error && "error"));
  at(n, { type: INPUT_TYPE[p.type] || "text", placeholder: p.placeholder, name: p.name, id: p.id, disabled: p.disabled });
  n.value = s(p.value);
  bindIn(n, c, readText, ["input"]);
  act(n, p, c, "change");
  return n;
},
"Textarea": function (p, c) {
  var n = h("textarea", cx("textarea", p.error && "error"));
  at(n, { rows: p.rows === undefined ? 4 : p.rows, placeholder: p.placeholder, name: p.name, id: p.id, disabled: p.disabled });
  n.value = s(p.value);
  bindIn(n, c, function (x) { return x.value; }, ["input"]);
  return n;
},
"Select": function (p, c) {
  var n = h("select", cx("select", p.error && "error"));
  at(n, { name: p.name, id: p.id, disabled: p.disabled });
  (Array.isArray(p.options) ? p.options : []).forEach(function (raw) {
    var o = obj(raw) ? raw : { value: raw, label: raw }, opt = h("option", null, s(pick(o, ["label", "value"], "")));
    at(opt, { value: o.value, disabled: o.disabled });
    n.appendChild(opt);
  });
  if (p.value !== undefined && p.value !== null) n.value = s(p.value);
  bindIn(n, c, function (x) { return x.value; }, ["change"]);
  return n;
},
"Checkbox": function (p, c) {
  var box = wrapLabel(p, c, "checkbox", "checkbox", function (x) { return x.checked; });
  box.checked = Boolean(p.checked);
  return lab(p, box);
},
"Radio": function (p, c) {
  var box = wrapLabel(p, c, "radio", "radio", function (x) { return x.value; });
  at(box, { value: p.value });
  box.checked = c.b ? s(c.r.get(c.b)) === s(p.value) : Boolean(p.checked);
  return lab(p, box);
},
"Switch": function (p, c) {
  var w = h("label", cx("label", p.error && "error")), box = h("input", cx("switch", p.error && "error"));
  w.appendChild(txt(label(p)));
  at(box, { type: "checkbox", name: p.name, disabled: p.disabled });
  box.checked = Boolean(p.checked);
  bindIn(box, c, function (x) { return x.checked; }, ["change"]);
  act(box, p, c, "change");
  w.appendChild(box);
  return w;
},
"FileInput": function (p, c) {
  var w = h("label", cx("label", p.error && "error"));
  var box = h("input", cx("file-input", mod(VARIANT.file, p.variant), p.dragover && "dragover", p.error && "error"));
  at(box, { type: "file", accept: p.accept, multiple: p.multiple, disabled: p.disabled });
  act(box, p, c, "change");
  w.appendChild(box);
  w.appendChild(txt(" " + label(p)));
  return w;
},
"CardOption": function (p, c) {
  var chk = p.control === "checkbox", n = h("label", cx("card-option", p.error && "error"));
  var box = h("input", chk ? "checkbox" : "radio");
  at(box, { type: chk ? "checkbox" : "radio", name: p.name, value: p.value, disabled: p.disabled });
  box.checked = c.b
    ? (chk ? Boolean(c.r.get(c.b)) : s(c.r.get(c.b)) === s(p.value))
    : Boolean(p.checked);
  bindIn(box, c, chk ? function (x) { return x.checked; } : function (x) { return x.value; }, ["change"]);
  n.appendChild(box);
  n.appendChild(h("strong", null, s(pick(p, ["title", "label"], ""))));
  if (p.description) {
    n.appendChild(document.createElement("br"));
    n.appendChild(txt(p.description));
  }
  return n;
},
"Table": function (p) {
  var cols = Array.isArray(p.columns) ? p.columns : [], rows = Array.isArray(p.rows) ? p.rows : [];
  var n = h("table", "table"), keys = cols.map(function (c) { return obj(c) ? pick(c, ["key", "label"], "") : c; });
  if (cols.length) {
    var tr = h("tr"), thead = h("thead");
    cols.forEach(function (c) {
      var th = h("th", null, s(obj(c) ? pick(c, ["label", "key"], "") : c));
      th.setAttribute("scope", "col");
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    n.appendChild(thead);
  }
  var body = h("tbody");
  rows.forEach(function (row) {
    var r = h("tr");
    if (obj(row)) keys.forEach(function (k) { r.appendChild(h("td", null, s(row[k]))); });
    else r.appendChild(h("td", null, s(row)));
    body.appendChild(r);
  });
  n.appendChild(body);
  // caption 按 HTML 规范必须是 table 的第一个子元素，DOM API 不会像静态解析那样自动重排。
  if (p.caption) n.insertBefore(h("caption", null, s(p.caption)), n.firstChild);
  return n;
},
"Progress": function (p) {
  var n = h("progress", cx("progress", mod(VARIANT.progress, p.variant)));
  n.setAttribute("max", s(p.max === undefined ? 100 : p.max));
  if (!p.indeterminate && p.value !== undefined && p.value !== null) {
    n.setAttribute("value", s(p.value));
    n.textContent = s(p.value);
  }
  return n;
},
"Meter": function (p) {
  var n = h("meter", "meter");
  at(n, {
    min: p.min === undefined ? 0 : p.min, max: p.max === undefined ? 100 : p.max,
    low: p.low, high: p.high, optimum: p.optimum, value: p.value === undefined ? 0 : p.value
  });
  n.textContent = s(p.value);
  return n;
},
"Details": function (p) {
  var n = h("details", "details");
  n.appendChild(h("summary", null, s(pick(p, ["summary", "title"], ""))));
  if (p.open) n.setAttribute("open", "");
  return n;
},
"TabItem": function (p, c) {
  var tag = p.href ? "a" : "button", n = h(tag, cx("tab-item", p.active && "active"));
  if (tag === "a") n.setAttribute("href", s(p.href));
  if (tag === "button") act(n, p, c, "click");
  n.appendChild(txt(label(p)));
  return n;
},
"MenuItem": function (p, c) {
  var list = h("ul", "card"), tag = p.href ? "a" : "button";
  var n = h(tag, cx("menu-item", p.active && "active")), item = h("li");
  list.style.listStyle = "none";
  list.style.margin = "0";
  list.style.padding = "0";
  if (tag === "a") n.setAttribute("href", s(p.href));
  if (tag === "button") act(n, p, c, "click");
  n.appendChild(txt(label(p)));
  item.appendChild(n);
  list.appendChild(item);
  return list;
},
"Dialog": function (p, c) {
  var pop = p.mode === "popover", form = h("form"), prev = c.r.dialogNodes[c.id];
  var n = h("dialog", cx("dialog", pop ? "popover" : "modal", own(ANCHOR, p.anchor) ? ANCHOR[p.anchor] : null));
  if (p.title) n.appendChild(para(p.title, ""));
  form.setAttribute("method", "dialog");
  form.appendChild(h("button", "button secondary", s(p.closeLabel === undefined ? "关闭" : p.closeLabel)));
  n.appendChild(form);
  if (c.b) {
    n.setAttribute("data-ai-bind", c.b);
    n.addEventListener("close", function () { c.r.setPath(c.b, false); });
  }
  // 无 $bindState 且上一实例被打开过又关掉：判为「用户已关闭」，之后任何重渲染都不再打开它。
  // 判据取旧节点的真实 open（同步事实），而不是 close 事件——后者是排队任务，会晚于同一次重渲染。
  c.r.dialogNodes[c.id] = n;
  c.r.dialogs.push({ n: n, open: Boolean(p.open) && !(prev && prev.__aiOpened && !prev.open), pop: pop });
  return n;
},
"Label": function (p) {
  var n = h("label", cx("label", p.error && "error"), label(p));
  if (p.for) n.setAttribute("for", s(p.for));
  return n;
},
"Legend": function (p) { return h("legend", cx("legend", p.error && "error"), label(p)); },
"HelperText": function (p) { return h("p", cx("helper-text", p.error && "error"), label(p)); }
};

/* ---- 渲染器实例：表达式 / 动作 / 挂载 / 焦点 / watch ---- */
function renderer(spec, mount, opts) {
  var r = {
    spec: spec, mount: mount,
    state: obj(opts.state) ? opts.state : {},
    handlers: obj(opts.handlers) ? opts.handlers : {},
    functions: obj(opts.functions) ? opts.functions : {},
    onAction: opts.onAction, onChange: opts.onChange,
    log: [], seen: Object.create(null), dialogs: [], dialogNodes: {}, dead: false, busy: false, again: false
  };
  var OPS = ["eq", "ne", "gt", "gte", "lt", "lte", "contains"];

  r.get = function (path) { return pget(r.state, path); };
  r.tpl = function (t) {
    if (typeof t !== "string") return "";
    return t.replace(/\$\{([^}]*)\}/g, function (all, path) {
      var v = r.get(path.trim());
      return v === undefined || v === null ? "" : s(v);
    });
  };
  r.eq = function (a, b) {
    return a === b || ((obj(a) || Array.isArray(a)) && j(a) === j(b));
  };
  r.cmp = function (op, a, b) {
    if (op === "eq") return r.eq(a, b);
    if (op === "ne") return !r.eq(a, b);
    if (op === "contains") {
      if (Array.isArray(a)) return a.some(function (x) { return r.eq(x, b); });
      return typeof a === "string" && b !== undefined && b !== null && a.indexOf(s(b)) !== -1;
    }
    var x = Number(a), y = Number(b);
    if (isNaN(x) || isNaN(y)) return false;
    return op === "gt" ? x > y : op === "gte" ? x >= y : op === "lt" ? x < y : x <= y;
  };
  r.cond = function (c) {
    if (!obj(c)) return Boolean(c);
    var out, i;
    var left = own(c, "$state") ? r.get(c.$state) : undefined;
    var ops = OPS.filter(function (o) { return own(c, o); });
    if (ops.length) {
      out = true;
      for (i = 0; i < ops.length; i++) {
        if (!r.cmp(ops[i], left, r.ev(c[ops[i]]))) { out = false; break; }
      }
    } else if (own(c, "truthy")) {
      out = c.truthy ? Boolean(left) : !left;
    } else if (own(c, "$state")) {
      out = Boolean(left);
    } else {
      out = Boolean(r.ev(c));
    }
    return c.not === true ? !out : out;
  };
  // 表达式求值：$state / $bindState / $cond / $template / $computed，其余递归下钻。
  r.ev = function (v) {
    if (Array.isArray(v)) return v.map(r.ev);
    if (obj(v)) {
      if (own(v, "$state")) return r.get(v.$state);
      if (own(v, "$bindState")) return r.get(v.$bindState);
      if (own(v, "$cond")) return r.cond(v.$cond) ? r.ev(v.$then) : r.ev(v.$else);
      if (own(v, "$template")) return r.tpl(v.$template);
      if (own(v, "$computed")) {
        var fn = r.functions[v.$computed];
        return typeof fn === "function" ? fn(r.ev(obj(v.args) ? v.args : {})) : undefined;
      }
      var out = {};
      for (var k in v) out[k] = r.ev(v[k]);
      return out;
    }
    return v;
  };
  r.setPath = function (path, value) {
    pset(r.state, path, value);
    r.render();
    if (typeof r.onChange === "function") r.onChange(r.state);
  };
  var hctx = {
    getState: function () { return r.state; },
    get: function (path) { return r.get(path); },
    set: function (path, value) { r.setPath(path, value); },
    log: r.log
  };
  r.dispatch = function (name, params) {
    var e = { at: Date.now(), name: s(name), params: params, handled: false };
    if (e.name === "setState") {
      var a = obj(params) ? params : {};
      if (typeof a.statePath === "string" && a.statePath) {
        r.setPath(a.statePath, r.ev(a.value));
        e.handled = true;
      }
    } else if (typeof r.handlers[e.name] === "function") {
      e.handled = true;
      r.handlers[e.name](params, hctx);
    }
    // 未注册的名字不抛异常，只记 handled 为 false（契约 §4.5）。
    r.log.push(e);
    if (typeof r.onAction === "function") r.onAction(e);
    return e;
  };

  r.kids = function (el, chain) {
    var f = document.createDocumentFragment(), parent = chain[chain.length - 1], prev = null;
    (Array.isArray(el.children) ? el.children : []).forEach(function (id) {
      if (!obj(r.spec.elements[id])) {
        f.appendChild(errBox("child " + s(id) + " of element " + parent + " does not exist"));
        return;
      }
      if (chain.indexOf(id) !== -1) {
        f.appendChild(errBox("children cycle at element " + s(id)));
        return;
      }
      var kid = r.build(id, chain.concat(id));
      if (kid) {
        // 连续的兄弟 MenuItem 复用同一个 ul.card，对齐上游「单个 ul.card 含多个 li」的 markup。
        if (menuList(prev) && menuList(kid)) {
          while (kid.firstChild) prev.appendChild(kid.firstChild);
        } else {
          f.appendChild(kid);
          prev = kid;
        }
      }
    });
    return f;
  };
  r.build = function (id, chain) {
    var el = r.spec.elements[id], i;
    if (!obj(el)) return errBox("element " + s(id) + " does not exist");
    if (Array.isArray(el.visible)) {
      for (i = 0; i < el.visible.length && r.cond(el.visible[i]); i++) {}
      if (i < el.visible.length) return null;
    }
    var type = el.type;
    var fn = typeof type === "string" && own(B, type) ? B[type] : null;
    if (!fn) return errBox("element " + id + " has unknown component type " + s(type));
    var raw = obj(el.props) ? el.props : {}, key = BIND[type];
    var bind = key && obj(raw[key]) && typeof raw[key].$bindState === "string" ? raw[key].$bindState : null;
    var n = fn(r.ev(raw), { b: bind, r: r, id: id });
    if (NO_CHILD[type]) return n;
    var kids = r.kids(el, chain);
    // Dialog 自带 form[method=dialog] 关闭按钮，子节点必须排在它前面。
    var form = type === "Dialog" ? n.querySelector("form") : null;
    if (form) n.insertBefore(kids, form);
    else n.appendChild(kids);
    return n;
  };

  // 焦点与光标保持：重渲染前记住绑定路径与选区，重渲染后按同一路径找回控件。
  r.grab = function () {
    var a = document.activeElement;
    if (!a || !r.mount.contains(a)) return null;
    var path = typeof a.getAttribute === "function" ? a.getAttribute("data-ai-bind") : null;
    if (!path) return null;
    return { path: path, value: a.value === undefined ? null : a.value,
      start: a.selectionStart, end: a.selectionEnd, dir: a.selectionDirection };
  };
  r.put = function (info) {
    if (!info) return;
    var list = r.mount.querySelectorAll("[data-ai-bind]"), target = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute("data-ai-bind") !== info.path) continue;
      if (info.value !== null && list[i].type === "radio" && list[i].value !== info.value) continue;
      target = list[i];
      break;
    }
    if (!target) return;
    target.focus();
    if (info.start === null || info.start === undefined) return;
    if (typeof target.setSelectionRange !== "function") return;
    try {
      target.setSelectionRange(info.start, info.end, info.dir || undefined);
    } catch (e) {
      // number / date 类输入在部分浏览器上禁止设选区，属真实异常，忽略。
    }
  };
  r.sync = function () {
    r.dialogs.forEach(function (d) {
      if (d.open) {
        if (!d.n.open) {
          if (d.pop) d.n.show();
          else d.n.showModal();
        }
        // 标记本实例真被打开过，供下一次重建区分「用户关掉了」与「本来就没开」。
        d.n.__aiOpened = true;
      } else if (d.n.open) {
        d.n.close();
      }
    });
  };
  // watch：被观察路径的值变化才触发，首帧只登记快照。
  r.watch = function () {
    var els = obj(r.spec.elements) ? r.spec.elements : {};
    for (var id in els) {
      var el = els[id];
      if (!obj(el) || !obj(el.watch)) continue;
      for (var path in el.watch) {
        var key = id + " " + path, now = j(r.get(path));
        var had = own(r.seen, key), before = r.seen[key];
        r.seen[key] = now;
        if (!had || before === now) continue;
        var job = el.watch[path];
        if (obj(job) && typeof job.action === "string") r.dispatch(job.action, r.ev(job.params || {}));
      }
    }
  };
  r.paint = function () {
    var focus = r.grab(), id = typeof r.spec.root === "string" ? r.spec.root : "", n = null;
    r.dialogs = [];
    if (id && obj(r.spec.elements) && obj(r.spec.elements[id])) n = r.build(id, [id]);
    else n = errBox("root element " + (id || "(missing)") + " does not exist");
    if (n) r.mount.replaceChildren(n);
    else r.mount.replaceChildren();
    r.sync();
    r.put(focus);
  };
  r.render = function () {
    if (r.dead) return;
    if (r.busy) { r.again = true; return; }
    r.busy = true;
    var pass = 0;
    try {
      do { r.again = false; r.paint(); r.watch(); } while (r.again && ++pass < 20);
    } finally {
      r.busy = false;
    }
  };
  r.destroy = function () {
    r.dead = true;
    r.dialogs = [];
    r.log.length = 0;
    r.mount.replaceChildren();
  };
  return r;
}

/* ---- 校验（契约 §4.6） ---- */
function cycleOf(els) {
  var done = Object.create(null);
  function walk(id, chain) {
    var el = els[id], i;
    if (!obj(el) || !Array.isArray(el.children)) return null;
    for (i = 0; i < chain.length; i++) if (chain[i] === id) return chain.slice(i).concat([id]);
    var next = chain.concat([id]);
    for (i = 0; i < el.children.length; i++) {
      if (done[el.children[i]] === true) continue;
      var c = walk(el.children[i], next);
      if (c) return c;
    }
    done[id] = true;
    return null;
  }
  for (var id in els) {
    if (done[id] === true) continue;
    var c = walk(id, []);
    if (c) return c;
  }
  return null;
}
function validate(spec) {
  var errors = [], els, id, el, i, cyc;
  if (!obj(spec)) return { ok: false, errors: ["spec is not an object"] };
  els = obj(spec.elements) ? spec.elements : null;
  if (!els) errors.push("spec.elements is missing or not an object");
  if (typeof spec.root !== "string" || !spec.root) errors.push("spec.root is missing");
  else if (els && !obj(els[spec.root])) errors.push("root element " + spec.root + " is not in spec.elements");
  if (els) {
    for (id in els) {
      el = els[id];
      if (!obj(el)) { errors.push("element " + id + " is not an object"); continue; }
      if (typeof el.type !== "string" || !el.type) errors.push("element " + id + " has no type");
      else if (!own(B, el.type)) errors.push("element " + id + " has unknown component type " + el.type);
      if (el.props !== undefined && !obj(el.props)) errors.push("element " + id + " props is not an object");
      if (el.children !== undefined) {
        if (!Array.isArray(el.children)) errors.push("element " + id + " children is not an array");
        else for (i = 0; i < el.children.length; i++) {
          if (!obj(els[el.children[i]])) errors.push("element " + id + " references missing child " + s(el.children[i]));
        }
      }
      if (el.visible !== undefined && !Array.isArray(el.visible)) errors.push("element " + id + " visible is not an array");
      if (el.watch !== undefined && !obj(el.watch)) errors.push("element " + id + " watch is not an object");
    }
    cyc = cycleOf(els);
    if (cyc) errors.push("children cycle detected " + cyc.join(" -> "));
  }
  return { ok: errors.length === 0, errors: errors };
}

/* ---- 由目录生成的 LLM 系统提示 ---- */
function buildPrompt() {
  var L = [
    "You write UI specs for the ai-html renderer. Reply with one JSON object and nothing else.",
    "Hard constraint: elements[].type may only be one of the component types listed below; any other type is rejected.",
    "",
    'Spec shape: { "root": "<id>", "elements": { "<id>": { "type": "<Type>", "props": {}, "children": ["<id>"] } } }',
    "root must be a key of elements; children is an array of element ids, never inline objects.",
    "Element fields: visible (array of conditions, AND; false skips the element and its subtree),",
    'watch ({ path: { action, params } }, fired on change of that path, never on the first render).',
    "",
    "Expressions, recursive, allowed in any prop value:",
    '  { "$state": "/form/name" } reads state at a JSON Pointer path',
    '  { "$cond": <condition>, "$then": <value>, "$else": <value> } picks a value',
    '  { "$template": "Hello, ${/user/name}!" } interpolates a path',
    '  { "$bindState": "/form/name" } two-way binds a control (value, checked or open)',
    '  { "$computed": "fnName", "args": {} } calls a registered function',
    '  condition: { "$state": "/p", "eq"/"ne"/"gt"/"gte"/"lt"/"lte": value }, plus "truthy": true,',
    '  or "contains": value, plus "not": true to negate.',
    "",
    'Examples: "visible": [{ "$state": "/form/agree", "truthy": true }]',
    '  "props": { "action": "setState", "actionParams": { "statePath": "/tab", "value": "b" } }',
    "",
    "Components (" + Object.keys(CATALOG).length + "):"
  ];
  Object.keys(CATALOG).forEach(function (type) {
    L.push("- " + type + ": " + CATALOG[type].description);
    CATALOG[type].props.forEach(function (p) { L.push("    " + p.name + ": " + p.type + " - " + p.description); });
  });
  return L.join("\n");
}

/* ---- 对外 API ---- */
function blank() { return { root: "", elements: {} }; }
var AIHtml = {
  version: VERSION,
  catalog: CATALOG,
  prompt: buildPrompt,
  validate: validate,
  render: function (spec, mount, opts) {
    var r = renderer(obj(spec) ? spec : blank(), mount, obj(opts) ? opts : {});
    r.render();
    return {
      getState: function () { return r.state; },
      get: function (path) { return r.get(path); },
      set: function (path, value) { r.setPath(path, value); },
      setSpec: function (next) { r.spec = obj(next) ? next : blank(); r.render(); },
      getActionLog: function () { return r.log.slice(); },
      dispatch: function (name, params) { return r.dispatch(name, obj(params) ? params : {}); },
      destroy: function () { r.destroy(); }
    };
  }
};

window.AIHtml = AIHtml;
})(window);