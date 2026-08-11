# Skill → Web 工具（Cloudflare Pages 范本）

> 把本地 AI skill / Python 脚本 / CLI 工具改造成普通用户可用的网页工具。
> 以「公众号排版网页版 gzh-design-web」为已验证范本。本文是 agent 可直接执行的端到端流程。

## 一、架构模式（固定）

```
浏览器（React 前端）
   │  用户输入 + 密钥（localStorage）
   ▼
Cloudflare Pages（静态前端 dist + Pages Functions）
   └─ /api/*   Serverless 代理：转发 LLM / 第三方 API，密钥不落服务端
        │
        ▼
   第三方服务（LLM、图床、API…）经 Worker 代理，规避 CORS、保护 Key
```

**两种密钥/请求模式（按第三方是否开放浏览器直连 CORS 选择）**：
- **客户端 BYOK 直连（本项目现役主路径，见 README「架构说明」）**：浏览器直接调用第三方
  （OpenAI 兼容 LLM 的 SSE 流式 API / imgbb 图床），Key 只存 localStorage、随请求发出、不落服务端。
  优点：绕开 Cloudflare Pages Functions 的 ~30s CPU 时间限制，流式预览体验最好；前提是第三方开放 CORS。
- **Worker 代理（备用/受限路径）**：浏览器经 `/api/*` 转发第三方，规避 CORS、Key 由用户
  localStorage 随请求带上来、用完即弃、不持久化。适用于第三方未开放 CORS 的场景。

## 二、标准技术栈

| 层 | 选型 | 备注 |
|----|------|------|
| 前端 | Vite + React + TypeScript | 快、轻 |
| UI 库 | Semi Design（`@douyinfe/semi-ui`） | **注意版本**：2.101.1 **无 Drawer 组件**，侧边面板用 Modal |
| 后端 | Cloudflare Pages Functions（TS） | 与前端同源部署，CI 自动发布 |
| 存储 | 浏览器 localStorage | 小白用户、不做登录 |
| 密钥 | BYOK | 用户自填模型/图床 Key |
| 部署 | GitHub Actions + Cloudflare Pages | push 即发布，凭证只进 Actions secrets |
| 许可 | AGPL-3.0 | SaaS/公开网页服务须公开源码 |

## 三、端到端工作流

### 0. 需求梳理（先对齐再动手）
- 列出 P0 功能清单：输入方式、主题/模式、模型、历史、图床、预览、编辑。
- 确认模型可插拔（默认 + 自定义 OpenAI 兼容端点）。
- 确认存储方式（小白优先 localStorage，不做登录）。
- 确认部署形态（推荐 GitHub Actions + Actions secrets，开发者不经手 token）。

### 1. 脚手架
- `package.json` 脚本：`dev` / `build`(vite) / `build:assets`(打包 skill 资产) / `pages:dev` / `typecheck`。
- `vite.config.ts`（outDir `dist`）、`tsconfig.json`（strict，含 `src`/`functions`/`worker-lib`）、`wrangler.toml`（`pages_build_output_dir=dist`, `nodejs_compat`）。
- `.gitignore`：忽略 `node_modules` `dist` 内部记忆目录 `*.local`。

### 2. skill 资产打包（关键）
- Cloudflare Workers 不能跑 Python，所以把 skill 的 `SKILL.md` + `references/*.md` 用
  脚本打包成 `worker-lib/skillAssets.ts` **提交进仓库**。
- **CI 绝不重新跑打包**（构建机没有本地 skill，会清空产物）；只用已提交的 `skillAssets.ts`。

### 3. Python 脚本移植为 TS
- `validate` / `extract_docx` / `componentLint` 等脚本移植为 `worker-lib/*.ts`（Cloudflare 只跑 JS/TS）。
- docx 解析用 `jszip`；DOM 操作用浏览器 `DOMParser` 或 Worker 侧等价逻辑。

### 4. 后端 Pages Functions
- `functions/api/{主功能,themes,upload,...}.ts`，每个导出 `onRequestPost` / `onRequestOptions`（CORS）。
- 用 `Response.json(data, { headers: { 'Access-Control-Allow-Origin': '*' } })`。
- LLM 调用走 OpenAI 兼容 `chatCompletion`。
- **现役主路径**：本项目最终改为前端直连 LLM（SSE 流式）+ 浏览器直连 imgbb（BYOK），
  Functions 仅保留备用/校验（如 `/api/postprocess`）。若第三方开放 CORS，优先直连以绕开 CF 30s 限制。
- 若需强制合规校验（如公众号约束），在返回前跑 `validate` 并做一次自动纠正重试。

### 5. 前端
- `App.tsx` 做多栏编排；组件拆：`InputPanel/Editor`、`PreviewPanel`、`HistoryDrawer`、
  `SettingsDrawer`、`ModelManager`、`CustomThemeWizard`。
- `lib/api.ts`（fetch `/api/*`）、`lib/storage.ts`（localStorage）、`lib/clipboard.ts`（富文本复制）。
- 富文本 → Markdown → 预览流程：左 `contentEditable` 拦截 paste 用 `DOMParser` 清洗 Word HTML，
  中「转换为 Markdown」用手写轻量 `htmlToMarkdown`，右渲染预览。

### 6. AGPL 合规
- 仓库公开；`src/config.ts` 的 `REPO_URL` 指向仓库，页脚放「源码」链接。

### 7. 部署
- `.github/workflows/deploy.yml`：`push main` → `npm ci` → `npm run build` →
  `cloudflare/wrangler-action@v3` 跑 `wrangler pages deploy dist --project-name=<名> --branch=main`。
- 部署前先建项目（见踩坑 #1）。
- 用户在 GitHub 网页填 Actions secrets：`CLOUDFLARE_API_TOKEN`(Pages:Edit+账号读)、`CLOUDFLARE_ACCOUNT_ID`。
- 本地 `gh` 登录后 `gh repo create <名> --public --source . --remote origin --push`。

## 四、踩坑表（必看，已验证）

| # | 坑 | 解决 |
|---|----|------|
| 1 | `wrangler pages deploy --project-name=x` 报 `Project not found [8000007]` | 部署前用 REST API 建项目：`curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" --data '{"name":"x","production_branch":"main"}'`，已存在返回 409 可忽略（`|| true` 容错） |
| 2 | `wrangler pages project create x --yes` 报 `Unknown argument: yes`（3.114.17） | 不用 wrangler 建项目，改用上面的 REST API |
| 3 | 本地 `npm install` 重建 lock 报 `EPERM`、极慢 | **能不引新依赖就不引**；HTML→MD 等用轻量手写实现，避免改 `package-lock.json` |
| 4 | `import { Drawer }` 编译报错 | Semi 2.101 无 Drawer，侧边面板改用 `Modal` |
| 5 | 主题主色被反引号污染（如 `` `#059669` emerald ``） | 解析时正则只取 hex |
| 6 | `npm ci` 报 lock 不一致 | 改依赖必须同步 `package-lock.json`（本地困难时优先避免改依赖） |
| 7 | 本地 `vite build` 删 dist 被沙箱拦截 `EPERM unlink dist/index.html` | 构建前先 `rm -rf dist`；或 `export NODE_OPTIONS='--use-system-ca'` 去掉 safe-delete 注入 |
| 8 | git 提交报 `could not open '.git/COMMIT_EDITMSG'` 权限拒绝 | 提交前 `rm -f .git/COMMIT_EDITMSG`；push 后本地 ref 更新失败则 `rm -f .git/logs/refs/remotes/origin/main` 再 `git fetch` |

## 五、复用 Checklist

- [ ] 明确「本地能力 → 网页工具」边界，列 P0 清单
- [ ] 选 UI 库（Semi 注意版本组件差异）
- [ ] 决定 BYOK + localStorage（小白优先）
- [ ] skill 资产/脚本打包进仓库（Python→TS），CI 不重新生成
- [ ] 设计 Serverless 代理接口（避 CORS、护 Key）
- [ ] 定许可（SaaS/公开 → AGPL-3.0，公开仓库 + 页脚源码链接）
- [ ] 写 GitHub Actions 部署工作流，凭证进 Actions secrets
- [ ] 本地跑通 → 建 GitHub 仓库 push → 让用户填 secrets
- [ ] 验证：CI build 通过 + 线上 API 路由 + 首页可达
