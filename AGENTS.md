# AGENTS.md — gzh-design-web

## 项目定位
公众号排版网页版：粘贴/上传文章 → 选主题 → 一键 AI 排版 → 预览 → 复制进微信公众号后台。
BYOK（模型/图床 key 由用户填、存浏览器 localStorage，不落服务端）；AGPL-3.0 公开仓。

## 怎么跑
```bash
npm install          # 安装依赖
npm run dev          # 前端 dev server → http://localhost:5173
npm run typecheck    # tsc --noEmit；提交前必须零错误
npm run build        # vite build → dist/
npm run build:assets # 仅当更新 skill 资产时重新打包 worker-lib/skillAssets.ts（CI 不重跑）
```
含 /api 的完整本地开发：`npm run build` 后 `npm run pages:dev`（wrangler pages dev）。

## 技术栈
Vite + React 18 + TypeScript(strict) · Semi Design(`@douyinfe/semi-ui`) · Cloudflare Pages
Functions(TS) · wrangler · mammoth.js(Word 解析) · jszip。Node ≥ 22（CI 用 22，本地实测 24 可用）。

## 目录与约定
- `src/` 前端：`App.tsx` 三栏编排；`components/` 各面板；`lib/` 工具；`config.ts` 存
  `APP_VERSION`（发布时手动 +1）与 `REPO_URL`（AGPL 源码链接）。
- `functions/api/` Pages Functions（备用/校验；`upload.ts` 已废弃 DEPRECATED）。
- `worker-lib/` Worker 共享逻辑，含**随仓库提交**的 `skillAssets.ts`（CI 不重新生成）。
- `scripts/build-assets.mjs` 打包 skill 资产。
- 部署：GitHub Actions（`.github/workflows/deploy.yml`）push main 即发布到 Cloudflare Pages，
  项目名 `gzh-design-web`；凭证只存 Actions secrets。
- 提交信息用中文 conventional 风格（fix:/feat:/docs:/chore:）。

## 当前状态与下一步
- 当前版本 v20260806.010（`src/config.ts` 的 `APP_VERSION`），线上 https://wwwx.eu.cc 运行中。
- 本地与远端同步于 `8f05c83`（修复 typecheck 类型错误）。
- 已知：`npm audit` 报 9 个漏洞（3 moderate / 6 high，依赖上游现状，未处理）。
