# gzh-design-web · 公众号排版网页版

把 [gzh-design](https://github.com/isjiamu/gzh-design-skill) 这套「公众号排版 Agent 技能」改造成**普通用户也能用的网页工具**：粘贴/上传文章 → 选主题 → 一键排版 → 预览 → 复制粘贴到微信公众号后台。

基于原 skill 的 AGPL-3.0 协议，本仓库同样以 AGPL-3.0 开源。

## 功能

- **多模型接入（BYOK）**：内置 DeepSeek、Kimi，并支持添加任意多个自定义 OpenAI 兼容模型。API key 由用户自己填写，仅在你发起请求时由服务端代理使用，不落库。
- **6 套内置主题**：摸鱼绿 / 红白色系 / 石墨极简 / 留白禅意 / 摸鱼票据 / 橄榄手记，可快捷选择。
- **自定义主题生成**：按描述生成一套新主题组件库并本地保存复用。
- **输入支持**：Markdown / 纯文本 / Word(.docx) 上传。
- **图床（BYOK）**：接入 imgbb，自己填 key，用于排版中插图上传。
- **合规校验**：服务端强制跑 `validate` 校验（公众号平台禁用项 + `<span leaf>` 包裹），ERROR=0 才放行。
- **历史记录**：本地保存排版历史，支持查看 / 复制 / 删除 / 批量删除。
- **一键复制**：复制带格式的富文本，直接粘进公众号编辑器保样式。

## 技术栈

- 前端：Vite + React + Semi Design
- 后端：Cloudflare Pages Functions（TypeScript Worker）
- 资产：`gzh-design` skill 的 `SKILL.md` 与 `references/` 组件库，构建时打包进 Worker（见 `scripts/build-assets.mjs` → `worker-lib/skillAssets.ts`）
- 存储：浏览器 `localStorage`（免登录）

## 本地开发

```bash
npm install
npm run build:assets   # 首次/更新 skill 后：把 skill 资产打包进 worker-lib/skillAssets.ts
npm run pages:dev      # 构建前端并启动 wrangler pages dev（含 functions）
# 或仅启动前端（需另开 wrangler 才有 /api）：
npm run dev
```

## 部署（Cloudflare Pages + Git 自动构建）

1. 把本仓库推到 GitHub（公开仓，满足 AGPL 源码开放义务）。
2. Cloudflare Pages 控制台「Create from Git」连接该仓库，生产分支 `main`，
   构建命令 `npm run build`，输出目录 `dist`。
3. 此后 `git push main` 即自动构建并发布。
4. 本项目为 BYOK，无需在 Cloudflare 配置任何服务端密钥。

## 目录结构

```
src/            前端（React + Semi Design）
functions/      Cloudflare Pages Functions（/api/layout, /api/upload, /api/theme）
worker-lib/     Worker 共享逻辑：资产、TS 版校验/提取/校验脚本、LLM 客户端、主题解析
scripts/        build-assets.mjs（打包 skill 资产）
```

## 许可证

AGPL-3.0。原 skill 与本项目均遵循该协议；在线服务页脚提供源码链接。
