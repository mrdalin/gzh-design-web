# gzh-design-web · 公众号排版网页版

把 [gzh-design](https://github.com/isjiamu/gzh-design-skill) 这套「公众号排版 Agent 技能」改造成**普通用户也能用的网页工具**：粘贴/上传文章 → 选主题 → 一键排版 → 预览 → 复制粘贴到微信公众号后台。

> 🤝 **原项目由 [甲木](https://github.com/isjiamu) × [「摸鱼小李」](https://mp.weixin.qq.com/s/EMahAzgfAbRQrYukWE7_IQ) 联名共建** —— 排版组件、主题设计与质量标准凝聚了两人的公众号实践与共同打磨，特别感谢小李。

## 功能

- **多模型接入（BYOK）**：内置 DeepSeek、Kimi、Agnes 等，并支持添加任意多个自定义 OpenAI 兼容模型。API key 由用户自己填写（存浏览器 localStorage），不落服务端。
- **6 套内置主题**：摸鱼绿 / 红白色系 / 石墨极简 / 留白禅意 / 摸鱼票据 / 橄榄手记，鼠标悬停可预览。
- **自定义主题生成**：按描述或参考图生成一套新主题组件库并本地保存复用。
- **输入支持**：
  - 富文本粘贴（从 Word / 网页直接带格式粘贴）
  - Markdown 编辑器（可二次编辑）
  - Word(.docx) 文件上传（客户端解析为 Markdown）
  - AI 文案生成（输入提示词让模型帮你写）
- **图床（BYOK）**：接入 imgbb，自己填 key，用于排版中插图上传。
- **双向同步**：富文本区 ↔ Markdown 区实时双向同步，编辑任一端另一端自动跟随。
- **草稿缓存**：内容自动保存到浏览器本地存储，刷新不丢失；提供一键清除按钮。
- **三栏联动滚动**：三个编辑区按比例联动滚动，方便定位和修改内容。
- **流式预览**：生成过程中实时显示排版进度和 token 用量，自动滚到底部（对话式效果）。
- **合规校验**：生成后自动跑 `validate` 校验（公众号平台禁用项 + `<span leaf>` 包裹），底部小字提示校验状态。
- **历史记录**：本地保存排版历史（最多 50 条），支持查看 / 复制 / 删除 / 批量删除。
- **一键复制**：复制带格式的富文本，直接粘进公众号编辑器保样式。
- **导出**：导出 HTML 文件 / 截长图 / 分段贴图打包（ZIP）。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vite + React 18 + TypeScript |
| UI 组件库 | Semi Design 2.x |
| 后端 | Cloudflare Pages Functions（TypeScript Worker） |
| 资产 | `gzh-design` skill 的 `SKILL.md` 与 `references/` 组件库，构建时打包进 Worker |
| 存储 | 浏览器 `localStorage`（免登录，BYOK 密钥不离浏览器） |
| Word 解析 | mammoth.js（客户端 docx → Markdown） |

## 架构说明

本项目采用**客户端 BYOK 直连模式**作为主架构：

1. 用户在浏览器填写 API Key（模型 / 图床），仅存 localStorage，不经过服务端。
2. 点击「生成排版」后，浏览器**直接调用 LLM 的 OpenAI 兼容 API**（SSE 流式返回），绕过 Cloudflare Pages Functions 的 ~30s CPU 时间限制。
3. 流式返回的 HTML 经前端 `liveClean()` 实时清理后展示在预览区（逐字输出效果）。
4. 生成完成后，可选地调用 `/api/postprocess` 做最终合规校验。

> 服务端 `/api/layout` 函数仍保留但已非主路径。Cloudflare 侧无需配置任何密钥。

## 本地开发

```bash
npm install
npm run build:assets   # 首次/更新 skill 后：把 skill 资产打包进 worker-lib/skillAssets.ts
npm run pages:dev      # 构建前端并启动 wrangler pages dev（含 functions）
# 或仅启动前端（需另开 wrangler 才有 /api）：
npm run dev
```

> 本机沙箱若因 safe-delete 拦截导致 `vite build` 清空 `dist` 失败，可临时执行
> `export NODE_OPTIONS='--use-system-ca'`（去掉其中的 `--require ...safe-delete` 注入）
> 后再构建。CI / Cloudflare 构建环境不受影响。

## 部署（Cloudflare Pages，GitHub Actions 自动发布）

本项目通过 GitHub Actions（`.github/workflows/deploy.yml`）在每次 push 到 `main` 时
自动构建并部署到 Cloudflare Pages，Cloudflare 凭证只存放在仓库的 **Actions secrets**，
不进代码、也不需要交给任何人。

1. 把本仓库推到 GitHub（**公开仓**，满足 AGPL-3.0 源码开放义务）。
2. 在 Cloudflare 控制台创建一个 **API Token**，权限勾选 `Cloudflare Pages: Edit`
   （以及账号级 `Account: Cloudflare Pages` 读权限），并记录你的 **Account ID**
   （Cloudflare 控制台地址栏 `dash.cloudflare.com/<account_id>/...`）。
3. 在仓库 `Settings → Secrets and variables → Actions → Repository secrets` 新增两条：
   - `CLOUDFLARE_API_TOKEN` = 上面的 API Token
   - `CLOUDFLARE_ACCOUNT_ID` = 你的 Account ID
4. push 到 `main` 即触发部署；之后每次 push 自动更新。若首次 push 时还没填 secret，
   可在填好后到 `Actions` 页面对该次运行点「Re-run jobs」。

> 本项目为 BYOK，Cloudflare 侧无需配置任何服务端密钥；用户密钥始终只在本机浏览器。

## 目录结构

```
src/
├── components/        React 组件
│   ├── App.tsx              主应用（三栏布局、状态管理）
│   ├── RichEditor.tsx       富文本编辑器（contentEditable）
│   ├── MarkdownEditor.tsx   Markdown 编辑器 + 工具栏
│   ├── EditorToolbar.tsx    编辑器工具栏（格式化按钮 / 上传）
│   ├── PreviewPanel.tsx     手机预览区（流式显示 / 复制 / 导出）
│   ├── ThemeBar.tsx         主题选择栏
│   ├── HistoryDrawer.tsx    排版历史抽屉
│   ├── ModelManager.tsx     模型配置弹窗
│   ├── ImgbbConfigModal.tsx 图片 API 配置弹窗
│   └── CustomThemeWizard.tsx 自定义主题向导
├── lib/
│   ├── api.ts               API 客户端（流式布局 / 图片上传 / 校验）
│   ├── htmlToMarkdown.ts    HTML → Markdown 转换
│   ├── markdownToHtml.ts    Markdown → HTML 转换（手写轻量）
│   ├── storage.ts           localStorage 封装（模型 / 历史 / 草稿）
│   ├── clipboard.ts         富文本剪贴板操作
│   ├── wordCount.ts         字数统计
│   ├── htmlToImage.ts       截图（html-to-image）
│   └── useScrollSync.ts     三栏联动滚动 hook
├── types.ts                 TypeScript 类型定义
├── config.ts                应用配置（版本号 / 仓库地址）
└── styles.css               全局样式
functions/          Cloudflare Pages Functions
worker-lib/         Worker 共享逻辑（资产 / 校验脚本 / LLM 客户端 / 主题解析）
scripts/            build-assets.mjs（打包 skill 资产）
```

## 6 套内置主题

| 主题 | 适合场景 | 主色 |
|------|---------|------|
| **摸鱼绿**（默认） | 教程、测评、清单、工具盘点 | `#059669` |
| **红白色系** | 深度分析、观点、力量感话题 | `#DC2626` |
| **石墨极简风** | 设计、科技评论、专业观点、高端品牌 | `#52525B` |
| **留白禅意风** | 禅意、极简生活、深度随笔 | `#4A5D52` |
| **摸鱼票据风** | 工具对比、创意评测 | `#059669` |
| **橄榄手记** | 内刊手记、深度评测、案例复盘 | `#1e1f23` |

> 主题预览图与完整设计规范见原项目 [theme-index](https://github.com/isjiamu/gzh-design-skill/blob/main/references/theme-index.md)。不够用可在本工具内通过「自定义主题」功能让 AI 生成新主题。

## 源码声明（AGPL）

在线服务页脚「源码」链接指向本项目的 GitHub 仓库（已写入 `src/config.ts` 的 `REPO_URL`）。部署后任何人可通过该链接获取完整源代码。

---

## License（许可证）

**AGPL-3.0 © 2026 甲木 × 摸鱼小李**

本项目基于 [gzh-design-skill](https://github.com/isjiamu/gzh-design-skill)（同样 AGPL-3.0）改造而来，采用 **GNU AGPL-3.0** 协议开源。要点：

1. **必须署名** — 保留版权与联名署名声明（甲木 × 摸鱼小李）。
2. **衍生品必须开源** — 任何修改版本、Fork、二次分发，必须以 AGPL-3.0（或兼容协议）公开发布，提供完整源代码。
3. **网络服务也要开源** — 即使只是把修改版本部署成 SaaS / Web 服务给别人用而不分发代码，也要公开源代码（这是 AGPL 区别于 GPL 的核心条款）。
4. **不允许闭源、专有化、仅付费分发** — 必须以相同协议共享。

完整协议文本见 [LICENSE](LICENSE)（项目中包含 AGPL-3.0 全文）。

> 🤝 **欢迎 AI Agent 厂商、模型厂商共创**：想把 gzh-design 集成进产品、或基于它做深度共建，欢迎联系原作者。

## 致谢（Credits）

- **[甲木](https://github.com/isjiamu)** × **[摸鱼小李](https://mp.weixin.qq.com/s/EMahAzgfAbRQrYukWE7_IQ)** — 原项目 [gzh-design-skill](https://github.com/isjiamu/gzh-design-skill) 的联名共建者。核心组件库（6 套主题 × 数十个精细组件）、主题设计标准、质量工程（双关卡可验证循环）、排版方法论均源自两人的公众号实践与共同打磨。
- **skill-optimizer** — 原项目质量工程的审计驱动方。
- **Semi Design** — 本项目 UI 组件库来源 ([字节跳动开源](https://semi.design/))。
- **mammoth.js** — Word(.docx) 解析引擎 ([mwilliamson/mammoth.js](https://github.com/mwilliamson/mammoth.js))。
- **Cloudflare Pages** — 免费托管与边缘部署平台。
- 所有开源社区贡献者。

---

*关注原项目公众号，获取更多 AI 干货与排版实践 👆*
