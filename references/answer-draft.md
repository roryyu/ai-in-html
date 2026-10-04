# answer-draft：「一页 HTML 回复」草稿语法（Mode C）

本文件是 `vendor/answer-me-with-html/am.mjs`（answer-me-with-html v0.4.6 CLI）的草稿书写说明。
你只写**内容稿**（扩展 Markdown），排版、模板、配色、暗黑模式、SVG 图形坐标全部由 CLI 完成——
**不要手写 HTML / CSS / SVG**。模型写稿量约为手写 HTML 的 1/7。

## 1. 调用方式

`am` 指本 skill 目录下的 vendored CLI；下文用 `AM` 表示**本 SKILL.md 所在目录的绝对路径**，需要 Node.js 20+：

````bash
node "$AM/vendor/answer-me-with-html/am.mjs" render - <<'AM_EOF'      # 从 stdin 渲染（agent 的调用方式）
---
title: 示例
---
## A 一个面板
```flow
A -> B: hello
```
AM_EOF

node "$AM/vendor/answer-me-with-html/am.mjs" render notes.md -o out.html --no-open   # 文件进、指定输出、不弹浏览器
node "$AM/vendor/answer-me-with-html/am.mjs" patch page.html --panel "面板标题" < panel.md   # 只替换一个 ## 面板，原地覆盖
node "$AM/vendor/answer-me-with-html/am.mjs" lint notes.md        # 只跑写作检查
node "$AM/vendor/answer-me-with-html/am.mjs" list                 # 组件列表
node "$AM/vendor/answer-me-with-html/am.mjs" help <component>     # 某组件完整语法（format / patch / video 亦可）
node "$AM/vendor/answer-me-with-html/am.mjs" config               # 查看设置（open / theme / mode / style 等）
````

- 产物是**单文件 HTML**（无 CDN、无外链、离线可开），默认落在 `~/.answer-me-with-html/pages/`；
  `AM_HOME` 改目录，`-o` 指定文件。页面右上角按钮可切主题/明暗并复制出这份草稿（`#am-source`）。
- 成功输出 `✓ <路径>`；失败输出 `✗ L<行号> [组件] …` + 正确示例——照示例改那一行再渲染一次即可。
- `STE n 条警告`：按建议改写后再渲染一次，最多重试 2 轮。

## 2. 稿件骨架

```markdown
---
template: sheet        # sheet = 网格面板一屏总览（默认）；doc = 单栏线性讲解带目录
theme: blueprint       # blueprint 图纸风（默认）| shadcn 卡片风
title: 页面标题
subtitle: 一句话说明    # 可选
cols: 3                # sheet 列数，默认 3；面板用 span / rows 跨列跨行
source: RFC 9293       # 其他任意 frontmatter 键都显示在页头元信息行
lang: zh               # 可选，强制界面语言（en / zh / ja）；含假名的稿件自动判为日文
style: 80              # 可选，写作检查：off | 80（只警告，默认）| strict（不达标不生成）
---
导语：一两句核心结论（可选）。

## A 面板标题 {span=2 meta="右上角小字"}
普通 Markdown：段落、列表、表格、引用。
表格状态词：ok / no / warn（可带文字："ok 已批准"）→ ✓ / ✗ / ! 徽章。

## B {bare}
无标题栏面板（适合放 kv 标题栏块）。
```

- 每个 `##` 标题是一个面板；字母 ID 可省略，自动分配。
- `span=2` 跨两列、`rows=2` 跨两行；等宽句子类组件（annot）至少给 `span=2`。
- 组件确实表达不了的信息形状，才用 ```html / ```svg 围栏块原样嵌入。

## 3. 按信息形状选组件

| 信息形状 | 组件 | 最小写法 |
| --- | --- | --- |
| 谁连向谁、架构、决策分支 | `flow [LR]` | `A -> B: 标签`；`A --> C` 虚线；`A -> B & C` 扇出；`{判断?}`、`(开始)`、`[(数据库)]`、`*重点`、`group 名: A, B` |
| 参与者之间按时间的消息 | `sequence [num]` | `A -> B: 请求`；`B --> A: 响应`（虚线箭头）；`note A, B: 说明`；`== 阶段 ==` |
| 层级 / 目录 / 分类 | `tree [list]` | 缩进表达层级；`标签 \| 说明`；`` `编号` 标签 `` |
| 历史 / 阶段 | `timeline [v]` | `时间 \| 标题 \| 说明`；`*` 高亮关键节点 |
| 数值与上限 | `limits` | `标签 \| 13 / 20 \| 单位`；只写上限：`标签 \| max 20` |
| 逐词点评一句话 | `annot` | `# 小标题 \| 右注`；`[片段]{注释}`；`[错词]{!红色注释}`；`> 底注` |
| 元信息 / 标题栏 | `kv [cols=2]` | `键: 值`；`* 宽格: 值` |
| 结论 / 提示 / 警告 | `callout <info\|ok\|warn\|err> 标题` | 正文 Markdown |
| 多维对比、能 / 不能清单 | Markdown 表格 | 状态列写 ok / no / warn |

选型原则：
- 先放结论：第一个面板或导语给出核心答案，后面的面板给证据。
- 一个面板只回答一个子问题；超过 8 个面板就拆页或删减。
- 不编数据：没有真实数字就不用 `limits`；示意数据要在说明里写明「示意」。

## 4. STE 受控写作（CLI 每次渲染自动检查）

- 一句话只说一件事；用主动语态；步骤用祈使句（「关闭阀门」，不写「阀门应被关闭」）。
- 一词一义：同一个东西全文用同一个叫法。
- 句长上限：步骤英文 20 词 / 中文 35 字；描述英文 25 词 / 中文 45 字；每段不超过 6 句。
- 英文用常见短词（use 不用 utilize，before 不用 prior to）；中文不用虚动词
  （「进行优化」→「优化」），不连用三个以上「的」，不用套话（赋能、闭环……）。
- 故意展示的反例用 `~~删除线~~` 或放进状态为 `no` 的表格行，检查会跳过。

## 5. 改已有页面：patch 而不是重写

页面 HTML 内嵌了出这份页的草稿（`#am-source`）。只改一个面板时：

```bash
node "$AM/vendor/answer-me-with-html/am.mjs" patch page.html --panel "面板标题" <<'AM_EOF'
## A 面板标题
新的内容
AM_EOF
```

`--panel` 匹配标题、字母 ID 或 `ID 标题`；找不到该面板或页面没有 `#am-source` 时不要改文件。

## 6. 回复纪律（终端侧）

- 出页面后，终端回复只给 2～3 行：一句核心结论 + 页面路径。不要把草稿或 HTML 贴回终端。
- 是否自动打开浏览器由 `am config` 的 `open` 决定；单次可用 `--no-open` / `--open` 覆盖。
- 闲聊、一句就能答清的问题（约 150 字内）、要立即复制执行的命令、用户要求纯文本时——不出页面。
