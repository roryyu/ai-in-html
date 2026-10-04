# Vendored: sashimi-ui CSS

| 项 | 值 |
| --- | --- |
| 上游 | https://github.com/yuto-hasegawa/sashimi-ui |
| 版本 | 2.1.0（npm `dist-tags.latest`，取件当日核对） |
| 许可 | MIT（见同目录 `LICENSE`，Copyright (c) 2025 Yuto Hasegawa） |
| 取件方式 | 指挥官 `curl` 自 jsDelivr，未做任何改写 |
| 用途 | 让 `ai-html` 产物与 playground 完全离线可渲染、可被 headless 门禁确定性验收 |

## 文件与校验和（SHA-256）

```
534a8054a77d2249aebf1d8f551d82414a89721029114a4aa143cd6bf309e6b5  baseline.css        (1288 B)
85be13d5234933a9a9560375972defbc3e0879dea7d9acc410813df2f4033a2a  bundle.css          (26307 B)
14b20b21e7e260775456964ab70b2be360602f07121e6b8db4fbcda606914d7b  default.theme.css   (1980 B)
```

门禁 `gates/verify-ai-html.sh` 会重算并比对上述哈希：**vendored CSS 属第三方素材，任何人（含子 Agent）不得改写**；升级版本必须由指挥官重新取件并同步本文件与门禁基线。

## 三个文件的分工

- `default.theme.css`：`--sui-*` 设计令牌（33 个），含 `prefers-color-scheme: dark` 深色覆盖。**必须先加载**。
- `bundle.css`：26 个组件的 class 样式（46 个 class 选择器），不含 baseline。
- `baseline.css`：裸元素基线样式（`body/p/h1-h4/hgroup/menu/mark/hr/figure/figcaption`），可选；playground 加载它以获得开箱即用的排版。

> 上游另有 `sui-bundle.css`（把 class 前缀成 `.sui-button` 等，用于避免与既有样式冲突），本工作区未 vendored；需要时在 CDN URL 中替换文件名即可。

## 等价的 CDN 用法（联网环境，无需 vendor）

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/default.theme.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sashimi-ui@2.1.0/dist/css/bundle.css">
```
