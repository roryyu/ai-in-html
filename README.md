# ai-html

让 AI agent 快速产出**可离线打开的 HTML 页面**：做界面用 [sashimi-ui](https://github.com/yuto-hasegawa/sashimi-ui)（MIT，纯 CSS，零 JS）组件与一份与 [vercel-labs/json-render](https://github.com/vercel-labs/json-render)（Apache-2.0）形态对齐的扁平 JSON spec；答复杂问题用 vendored 的 [answer-me-with-html](https://github.com/QingYunA/answer-me-with-html)（MIT）CLI，把一页扩展 Markdown 草稿渲染成单文件 HTML 讲解页。

## 三种模式

| | Mode A 静态直出 | Mode B spec 驱动 | Mode C 一页 HTML 回复 |
| --- | --- | --- | --- |
| 怎么写 | 手写 HTML + sashimi class，**零 JavaScript** | 一份 JSON spec + `runtime/ai-html.js` | 一页扩展 Markdown 草稿 + `vendor/answer-me-with-html/am.mjs` 一次渲染 |
| 能做什么 | HTML 原生交互：`details`、`dialog`、表单、伪类 | 状态、条件渲染（`visible`）、`$bindState` 双向绑定、`watch` 联动、动作派发 | flow/sequence/tree/timeline/对比表格等讲解组件，blueprint/shadcn 双主题，STE 受控写作检查 |
| 什么时候用 | **做界面默认**。结构已知、不需要状态 | 界面结构运行时才确定 / 需要状态与条件 / 跨端复用 | 问题满屏文字读不动时：多概念/流程/对比/层级/演进，或用户说「用 HTML 讲」 |

Mode A/B 共用同一套 46 个 class 白名单与 33 个 `--sui-*` 设计令牌；三种模式的产物都**离线自包含**（`file://` 双击可开，无 CDN、无构建、无依赖；Mode C 需本机有 Node.js 20+ 跑渲染 CLI）。

## 目录

```
ai-html/
├── SKILL.md                      技能主文件：决策树、31 个 type 速查、17 条硬规则、Mode C 工作流
├── README.md                     本文件
├── runtime/
│   └── ai-html.js                零依赖 spec -> DOM 渲染器（经典 script，IIFE，只挂 window.AIHtml）
├── references/
│   ├── sashimi-catalog.md        sashimi-ui 事实面：加载方式、46 class、修饰矩阵、26 组件、33 令牌
│   ├── spec-contract.md          spec 契约与 runtime API、缺陷修复记录、与真实 json-render 的差异
│   ├── recipes.md                五个可复制 spec 骨架 + 升级到 @json-render/* 的路径
│   └── answer-draft.md           Mode C 草稿语法：组件最小写法、STE 写作、patch 用法
├── examples/
│   ├── static.html               Mode A 模板：今日菜单，零 <script>
│   └── spec-driven.html          Mode B 最小模板：spec 常量 + 挂载 + 同步自测挂点
├── playground/
│   └── index.html                交互式编辑器：左侧改 spec，右侧看渲染 / 状态 / 动作日志
└── vendor/
    ├── sashimi-ui/               上游 CSS 原样取件（v2.1.0）
    │   ├── default.theme.css     设计令牌，必须先加载
    │   ├── bundle.css            组件样式
    │   ├── baseline.css          裸元素基线（可选）
    │   ├── LICENSE               MIT
    │   └── VERSION.md            取件记录与 SHA-256 基线
    └── answer-me-with-html/      Mode C 渲染 CLI 原样取件（v0.4.6，单文件，需 Node.js 20+）
        ├── am.mjs                render / patch / lint / help / config / clean
        ├── LICENSE               MIT
        └── VERSION.md            取件记录与 SHA-256 基线
```

`vendor/**` 是第三方素材，门禁按 SHA-256 比对，**任何人都不要改写**。

## 作为 Agent Skill 安装

仓库地址：https://github.com/roryyu/ai-in-html。整个技能就是一个目录（含 `SKILL.md` 及其
`runtime/`、`references/`、`examples/`、`playground/`、`vendor/`），把它放进 agent 的 skills
目录即可，**目录名要等于 `SKILL.md` frontmatter 里的 `name`（`ai-in-html`）**。

**方式一：从仓库 clone（推荐，随仓库同步更新）**

```bash
git clone https://github.com/roryyu/ai-in-html.git \
  /path/to/your/agent/.agents/skills/ai-in-html
```

**方式二：本地复制**（产物自包含，适合离线交付）

```bash
# 在本仓库根目录执行
cp -R ai-html /path/to/your/agent/.agents/skills/ai-in-html

# 或建立符号链接，便于随本地仓库改动同步
ln -s "$PWD/ai-html" /path/to/your/agent/.agents/skills/ai-in-html
```

装好后 agent 读到 `SKILL.md` 的 frontmatter 就能按需加载 `references/` 与 `examples/`。

## 开始使用

装好后，直接对 agent 说一句需求即可触发本技能。三个模式各一个最小示例：

- **Mode A 做界面（默认）**：
  > 「用 ai-in-html 做一个今日菜单的静态 HTML 页，离线能双击打开。」
  agent 会手写 HTML + sashimi class、零 JavaScript，产物类似 `examples/static.html`。

- **Mode B spec 驱动**：
  > 「用一份 JSON spec 做一个带表单双向绑定和条件渲染的设置页。」
  agent 会写一份 spec 常量 + `runtime/ai-html.js` 渲染，产物类似 `examples/spec-driven.html`；
  可打开 `playground/index.html` 左边改 spec、右边看渲染。

- **Mode C 一页 HTML 答问题**：
  > 「RPS 限流算法的原理我没看懂，用 HTML 给我讲讲。」
  agent 会写一页扩展 Markdown 草稿，再用 vendored CLI 一次渲染成单文件讲解页：

  ```bash
  node vendor/answer-me-with-html/am.mjs render draft.md -o answer.html
  ```

  （需本机 Node.js 20+；`answer.html` 同样离线自包含，双击可开。）

### 不装 agent，纯手动跑

只想看效果，跳过安装：`git clone` 后直接双击 `examples/static.html`、`examples/spec-driven.html`
或 `playground/index.html`（详见下方「打开 playground」）。

## 打开 playground

**方式一：直接双击** `playground/index.html`。runtime 是经典 script（不是 ES module），所以
`file://` 下不会被 CORS 拦；页面内的图标是内嵌 sprite，CSS 是 vendored 相对路径，全程不联网。
URL 参数：`playground/index.html#preset=form` 初始载入 `form` 预设，`#selftest=off` 跳过自动自测
（预设 id：`landing` / `dashboard` / `form` / `settings` / `all`）。

**方式二：起一个本地静态服务器**（剪贴板 API 在部分浏览器下对 `file://` 更宽松）：

```bash
cd ai-html
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/playground/
```

两个 examples 同理：`examples/static.html`（Mode A）与 `examples/spec-driven.html`（Mode B 最小模板）。

## 门禁复现

从工作区根目录跑：

```bash
bash gates/verify-ai-html.sh
```

门禁用 headless Chrome 做真实渲染验收，逐项判定九个产物文件的存在性、体积区间、HTML 结构、
离线自包含（无外链 `src`/`href`/`url()`/`@import`/`fetch`）、vendored CSS 的 SHA-256、
runtime 的 spec 契约与表达式实现、playground 的自测挂点，以及页面里真实计算样式
（`.button` 的 `borderTopLeftRadius` 应为 `8px`、背景色非全透明）。页面上还挂了
`<div id="selftest" hidden>`，把 `data-status` / `data-*` 写在 DOM 快照里供门禁读取。

