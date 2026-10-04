# Vendored: answer-me-with-html CLI

| 项 | 值 |
| --- | --- |
| 上游 | https://github.com/QingYunA/answer-me-with-html |
| 版本 | 0.4.6（package.json `version`，commit `300b530`，取件当日核对） |
| 许可 | MIT（见同目录 `LICENSE`） |
| 取件方式 | `git clone --depth 1` 后原样复制 `skills/answer-me-with-html/scripts/am.mjs`，未做任何改写 |
| 用途 | Mode C「一页 HTML 回复」的渲染器：模型只写扩展 Markdown 草稿，排版/配色/图形坐标全部由 CLI 完成 |

## 文件与校验和（SHA-256）

```
b2ca7163eaa46a4170ac165611946a6620f3f4ada2cc38f270eacea74db9ea69  am.mjs  (305266 B)
```

`am.mjs` 是上游构建产物（单文件、无 npm 依赖，marked 与 @dagrejs/dagre 已打进包内），**需要 Node.js 20+**。属第三方素材，任何人不得改写；升级版本必须重新取件并同步本文件。

## 运行形态

- 经典 `node am.mjs render|patch|lint|list|help|config|clean ...`，全部离线可用。
- 页面默认写到 `~/.answer-me-with-html/pages/`，可用 `AM_HOME` 或 `-o` 改位置。
- 渲染失败时输出 `✗ L<行号> [组件] …` + 正确示例；STE 写作检查默认只警告。

Mode C 的草稿语法与组件选型见 `../../references/answer-draft.md`。
