# gzh-design-web · 公众号排版网页版

> 📦 仓库地址：[mrdalin/gzh-design-web](https://github.com/mrdalin/gzh-design-web)（AGPL-3.0，源码公开）

把 [gzh-design](https://github.com/isjiamu/gzh-design-skill) 这套「公众号排版 Agent 技能」改造成**普通用户也能用的网页工具**：粘贴/上传文章 → 选主题 → 一键排版 → 预览 → 复制粘贴到微信公众号后台。

> 🤝 **原项目由 [甲木](https://github.com/isjiamu) × [「摸鱼小李」](https://mp.weixin.qq.com/s/EMahAzgfAbRQrYukWE7_IQ) 联名共建** —— 排版组件、主题设计与质量标准凝聚了两人的公众号实践与共同打磨，特别感谢小李。

---

## 功能

- **多模型接入（BYOK）**：内置 Agnes / DeepSeek / Kimi / 智谱 GLM / 通义千问 五个预设，并支持添加任意多个自定义 OpenAI 兼容模型；下拉与配置弹窗均带品牌头像。API Key 由用户自己填写（存浏览器 localStorage），不落服务端。
- **6 套内置文章主题**：摸鱼绿 / 红白色系 / 石墨极简 / 留白禅意 / 摸鱼票据 / 橄榄手记，鼠标悬停可预览。
- **自定义主题生成**：按描述或参考图生成一套新主题组件库并本地保存复用。
- **界面主题色切换**：右上角四个小色块，一键切换全站主色——公众号橙红 / Semi 蓝 / 公众号绿 / 极简黑，选择写入 `localStorage` 刷新不丢；logo 与 favicon 同步跟随。
- **模型下拉显示实际模型名**：下拉列表与选中态直接显示模型标识（如 `agnes-2.5-flash`），而非渠道名，一眼看清当前用的是哪个模型。
- **输入支持**：
  - 富文本粘贴（从 Word / 网页直接带格式粘贴）
  - Markdown 编辑器（可二次编辑）
  - Word(.docx) 文件上传（客户端 mammoth 解析：富文本区**保真显示**原始样式（加粗/标题/列表），Markdown 区同步转换供编辑；**文字先出、图片异步补**——解析时文字立即渲染，图片先以本地预览显示、后台并发上传图床后再无缝替换为真实链接；已配置图床时上传过程有全屏顶层进度遮罩、按钮自动禁用，Markdown 区以整洁占位符占位，多图 Word 也不卡顿、不误以为解析失败）
  - AI 文案生成（输入提示词让模型帮你写）
- **图床（BYOK）**：接入 imgbb，自己填 key，用于排版中插图上传。上传通道已**免 base64 且浏览器直连 imgbb**（浏览器直接以二进制字节 POST 到 `https://api.imgbb.com/1/upload`，密钥本就在浏览器、不经服务端）；并对 imgbb 的错误码做了中文细分提示（限流 / Key 无效 / 超 32MB / 格式损坏 / 维护页等），所有上传入口（文件、富文本插图、Word）的错误提示更可读、可操作。
- **双向同步**：富文本区 ↔ Markdown 区实时双向同步，编辑任一端另一端自动跟随。
- **草稿缓存**：内容自动保存到浏览器本地存储，刷新不丢失；提供一键清除按钮。
- **三栏联动滚动**：三个编辑区按比例联动滚动，方便定位和修改内容。
- **深色模式预览**：预览区工具栏「🌙 深色 / ☀️ 亮色」一键切换，模拟微信公众号深色模式下的排版效果（移植自 [wechatjs/mp-darkmode](https://github.com/wechatjs/mp-darkmode) 的颜色语义保全算法，感知亮度 + HSL 调整保证视觉一致）；流式生成期间不可切换，复制 / 导出 / 截图时自动恢复亮色，避免暗色样式进入公众号产出物。
- **流式预览**：生成过程中实时显示排版进度和 token 用量，自动滚到底部（对话式效果）。
- **合规校验**：生成后自动跑 `validate` 校验（公众号平台禁用项 + `<span leaf>` 包裹），底部小字提示校验状态。
- **排版历史**：本地保存排版历史（最多 50 条），支持查看 / 复制 / 删除 / 批量删除；按钮带数字角标（99+ 上限），0 条不显示。
- **必填项提示**：在「模型 API」弹窗中，API 地址 / API KEY / 模型名称 留空时输入框显示红色边框，与保存校验逻辑一致。
- **一键复制**：复制带格式的富文本，直接粘进公众号编辑器保样式。
- **导出**：导出 HTML 文件 / 截长图 / 分段贴图打包（ZIP）。文件名格式：`排版_标题前3字_主题名_时间戳(YYYYMMDD_HHmm)`。

## 技术栈

| 层 | 技术 |
|------|---------|
| 前端框架 | Vite + React 18 + TypeScript |
| UI 组件库 | Semi Design 2.101.1 |
| 后端 | Cloudflare Pages Functions（TypeScript Worker） |
| 资产 | `gzh-design` skill 的 `SKILL.md` 与 `references/` 组件库，构建时打包进 Worker |
| 存储 | 浏览器 `localStorage`（免登录，BYOK 密钥不离浏览器） |
| Word 解析 | mammoth.js（客户端 docx → 保真 HTML（富文本区）+ Markdown（编辑区）） |

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

## 在线访问

本项目已绑定自定义域名，可直接访问：**https://wwwx.eu.cc**

（Cloudflare Pages 默认提供的 `*.pages.dev` 子域名仍可用，但自定义域名更便于分享与记忆。）

## 目录结构

```
src/
├── components/        React 组件
│   ├── App.tsx              主应用（三栏布局、状态管理、界面主色注入）
│   ├── RichEditor.tsx       富文本编辑器（contentEditable）
│   ├── MarkdownEditor.tsx   Markdown 编辑器 + 工具栏
│   ├── EditorToolbar.tsx    编辑器工具栏（格式化按钮 / 上传）
│   ├── PreviewPanel.tsx     手机预览区（流式显示 / 复制 / 导出）
│   ├── ThemeBar.tsx         文章主题选择栏
│   ├── HistoryDrawer.tsx    排版历史抽屉
│   ├── ModelManager.tsx     模型配置弹窗
│   ├── ImgbbConfigModal.tsx 图片 API 配置弹窗
│   └── CustomThemeWizard.tsx 自定义主题向导
├── colorThemes.ts      界面主题色预设（橙红/蓝/绿/黑 4 套）+ 运行时注入逻辑（含 favicon 跟随）
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

## 两类「主题」的区别

本项目有两层独立可配的「主题」，请勿混淆：

| 维度 | 文章主题（6 套） | 界面主题色（4 套） |
|------|---------|
| 作用对象 | 文章排版样式（标题/正文/卡片/配色方案） | 全站 UI 主色（按钮/链接/边框/选中态） |
| 选择位置 | 「选择主题」一行的卡片 | 右上角四个小色块 |
| 选项 | 摸鱼绿、红白色系、石墨极简、留白禅意、摸鱼票据、橄榄手记 | 公众号橙红 `#FA5151`、Semi 蓝 `#3491FA`、公众号绿 `#069A4C`、极简黑 `#333333` |
| 持久化 | 当前选择随内容一起保存 | `localStorage('gzh-theme-color')`，默认公众号绿 |

> 界面主题色切换时，网站 logo 与浏览器 favicon 会同步跟随当前主色；首次加载默认公众号绿。

## 6 套内置文章主题

| 主题 | 适合场景 | 主色 |
|------|---------|
| **摸鱼绿**（默认） | 教程、测评、清单、工具盘点 | `#059669` |
| **红白色系** | 深度分析、观点、力量感话题 | `#DC2626` |
| **石墨极简风** | 设计、科技评论、专业观点、高端品牌 | `#52525B` |
| **留白禅意风** | 禅意、极简生活、深度随笔 | `#4A5D52` |
| **摸鱼票据风** | 工具对比、创意评测 | `#059669` |
| **橄榄手记** | 内刊手记、深度评测、案例复盘 | `#1e1f23` |

> 主题预览图与完整设计规范见原项目 [theme-index](https://github.com/isjiamu/gzh-design-skill/blob/main/references/theme-index.md)。不够用可在本工具内通过「自定义主题」功能让 AI 生成新主题。

## 版本与回退

- 当前版本号见 `src/config.ts` 的 `APP_VERSION`（格式 `YYYYMMDD.00X`，每日重置，硬刷新生效）。
- **稳定锚点（均已打 git tag，可随时回退）**：
  - `v20260806.004`（commit `9672e09`）：**上传可用基线（仍推荐）**。图片上传改为**浏览器直连 imgbb**（`https://api.imgbb.com/1/upload`，原字节 FormData、免 base64），彻底解决之前经 Cloudflare Functions 代理 `/api/upload` 上传必 502 的问题（CF 出口 fetch 到 api.imgbb.com 被平台层整体拦截，与代码无关）。**这是首个能正常上传图片的版本**（v005 起在其基础上增强多图限流，上传持续可用）；imgbb 错误码中文细分提示也随之前置到前端。
    ```bash
    git checkout v20260806.004   # 检出后重新构建部署即可
    ```
  - `v20260812.007`（commit `51a17e8`，**当前最新功能版**，版本号见 `src/config.ts` 的 `APP_VERSION`）：自定义主题向导两种方式改为平分宽度按钮组切换，选中态高亮填充（与「风格」行按钮样式一致），区分更清楚。
  - `v20260812.006`（commit `cd04047`）：模型管理 + 自定义主题向导优化——通义千问开通地址更新为百炼控制台、文案精简为「支持图片」、点击自定义主题卡片未生成时直接开向导不再弹冗余 Toast、自定义主题弹窗改为两个一级 Tab（文字描述 / 上传参考图）。
  - `v20260812.005`（commit `babf703`）：代码复查修复——自定义主题向导模型下拉显示「视觉」标记（与模型管理一致）、向导打开时同步最新选中模型、参考图文件选择框重置 value 允许重复选同一张图。
  - `v20260812.004`（commit `201d0f0`）：参考图生成主题——模型管理新增「支持视觉/多模态」勾选（列表显示「视觉」标记），自定义主题新增「上传参考图」创建方式（自动压缩后浏览器直连多模态模型生成完整主题，新增 `/api/theme-prompt` 取提示词、`generateThemeByImage` 直连），未勾选视觉的模型阻止生成并引导勾选。
  - `v20260812.003`（commit `c5070aa`）：功能统一——模型 API KEY 输入框增加「显示/隐藏」切换（与 imgbb Key 一致，默认圆点隐藏、可切换明文查看，打开/编辑时重置为隐藏）。
  - `v20260812.002`（commit `0ee5742`）：API Key 输入框不再触发 Chrome 密码管理器——imgbb Key / 模型 API KEY 由 `type="password"` 改为 `type="text"` + `autoComplete="off"` + CSS `-webkit-text-security` 视觉圆点隐藏，Chrome 不再弹出保存/新建密码建议。
  - `v20260812.001`（commit `3b2a8c0`）：首屏体积优化——Word 解析（mammoth 及依赖）与 ZIP 导出（jszip）改为动态 import 懒加载，主 bundle 1.11MB → 620KB（gzip 325KB → 195KB），低频功能按需异步加载。
  - `v20260811.002`（commit `afd792e`）：手机端兼容优化——<480px 时 header 单行图标化（按钮只留图标、logo 只留 SVG、下拉只留头像）、Semi Modal 全宽、Markdown 编辑器标题栏自适应分行。
  - `v20260811.001`（commit `5a66f45`）：窄屏响应式优化——窗口 <1100px 时三栏由横排切换为纵向堆叠（消除横向滚动）；同日还含深色模式预览切换、模型保存双提示/Chrome 密码提示/Word 图片 alt 路径修复、Word 导入改用 convertToHtml 保真。
  - `v20260806.010`（commit `062bac9`）：空态手机框撑满预览区高度（三栏布局重构 v006→v010 的最终形态）。
  - `v20260806.009`（commit `cdb14da`）：去掉手机框内部滚动条，滚动统一交给右栏舞台。
  - `v20260806.008`（commit `8c6eb7b`）：手机外框改细边浅色、自然高度。
  - `v20260806.007`（commit `9929a6a`）：三栏回退等宽，手机预览改为居中悬浮外框。
  - `v20260806.006`（commit `bd270b4`）：三栏布局改为均衡优先（右栏锁 390 手机外框 + 左中等分）。
  - `v20260806.005`（commit `71ae252`）：在 v004 浏览器直连 imgbb 基础上，增加**多图 Word 限流防护**——Word 图片上传改并发受限队列（最多 3 张同时）+ `uploadImageBytes` 内置 429/网络抖动指数退避重试（最多 4 次），几十张图的 Word 也能稳定传完、不再因瞬时并发触发 imgbb 限流（429）而部分失败。
  - `v20260806.003`（commit `2f84a8e`，**历史记录 / 不可用**）：曾尝试把 CF→imgbb 改回 base64 字符串以绕开 502，但线上仍被 CF 平台层拦截，故仅作排障记录，不可作回退锚点。
  - `v20260806.002`（commit `78814f4`，**兜底回退点 / 仅非上传功能可用**）：imgbb 图床优化：上传通道免 base64 + 服务端对 imgbb 错误码做中文细分提示。注意：该版本及更早版本的上传仍走 `/api/upload` 代理，在当前 CF 环境下上传图片会 502，仅适合回退「非上传类」问题。
    ```bash
    git checkout v20260806.002   # 检出后重新构建部署即可
    ```
  - `v20260805.039`（commit `0ce1853`，**兜底回退点**）：彻底堵住 Word 图片占位相关两条漏：富文本占位 SVG 改为 100% 宽度 + 三行文字，提示信息不再被截断；富文本 → Markdown 的所有入口（手动「转换为 Markdown」、自动同步、粘贴/插入图片）都先清洗 data:image 占位图 / base64，再转 Markdown，中间编辑器绝不再出现 base64 长串。
    ```bash
    git checkout v20260805.039   # 检出后重新构建部署即可
    ```
  - `v20260805.038`（commit `5eb6dbc`，**兜底回退点**）：顶栏交互升级（未配置红点角标 + GitHub Star 按钮）。可作 v039 之前的稳定兜底。
  - `v20260805.037`（commit `1519cf0`，**兜底回退点**）：Word 图片上传体验打磨：无 Key 时 Markdown 绝不再泄漏 base64，配置 Key 后上传弹出全屏进度遮罩。可作 v038 之前的稳定兜底。
  - `v20260805.036`（commit `a4f42bb`）：v035 的强化版。把 Word 图片上传打磨到「稳定好用」：受控内联进度条、Markdown 彻底无 base64、imgbb 错误人话化；上传更稳更快。
  - `v20260805.033`（commit `d1187bb`）：Word 上传「文字先出 + 图片异步补」奠基版本，功能完整稳定。
  - `v20260805.026`（commit `d6eb949`）：早期稳定版（3 套界面色、模型下拉显模型名、必填项红框、历史角标等）。
- 完整变更历程见下方「更新历程」。

### 更新历程（v20260805.006 → v20260812.001）

| 版本 | 关键改动 |
|------|---------|
| v20260805.006 | 补全 favicon（svg + 多尺寸 ico） |
| v20260805.007 | 导出文件名改为短格式（标题前3字 + 时间戳） |
| v20260805.008 | 导出文件名加入主题名 |
| v20260805.009 | 时间戳去秒 + 页面 logo 改为与 favicon 同款绿色 SVG |
| v20260805.010 | 主题栏加「选择主题」提示 |
| v20260805.011 | 提示精简为 4 字 + 修复悬停预览图被裁剪不显示 |
| v20260805.012 | 预览图按主题 id 匹配，修复 4 个主题不显示 |
| v20260805.013 | 主题展示顺序调整 + 方图/竖长图样式区分 |
| v20260805.014 | 提示「选择主题」竖排绿字 |
| v20260805.015 | 编辑框 U 型边框修复 + 全站主色统一为公众号绿（重要：Semi 变量机制） |
| v20260805.016 | 主色由 `#07C160` 调为更沉稳的 `#069A4C` |
| v20260805.017 | 未配置模型 Key 提示文案修正 |
| v20260805.018 | 右上角 3 主题色切换器（蓝/绿/白灰，localStorage 持久化） |
| v20260805.019 | 色块移至「选择主题」行最右 + 版本号回归网站名后 |
| v20260805.020 | 色块移回 header、模型下拉前；保持 header 高度 |
| v20260805.021 | 顶部控件间距统一为 12px |
| v20260805.022 | 排版历史数字角标（99+）+ 模型管理提示语修正 + Agnes 标注「免费开通 API」 |
| v20260805.023 | 角标 0 条不显示 + 字号缩小 + 提示语去掉多余「经」字 |
| v20260805.024 | API Key 空值红框提示 |
| v20260805.025 | 必填项（API地址/API KEY/模型名称）红框一致性修复 |
| v20260805.026 | 模型下拉显示实际模型名 + Header 按钮加卡片风格圆角边框 |
| v20260805.027 | logo/favicon 跟随界面主题色 + 新增公众号橙红第 4 套界面色（红蓝绿黑排序） |
| v20260805.028 | 模型列表 / 弹窗加入品牌 LOGO 头像；Header 模型下拉改 Dropdown+Button（勾选图标用 IconTick 避坑） |
| v20260805.029 | 头像统一用显示名首字母；新增「智谱 GLM(Z)」「通义千问(Q)」两个预设 |
| v20260805.030 | 模型管理保存后若无可用模型则自动设为「使用中」 |
| v20260805.031 | 「恢复默认模型」按钮加 Popconfirm 二次确认，防误点丢失 API Key |
| v20260805.032 | 模型管理新增「保存并使用」按钮（强制切换到刚保存的模型） |
| v20260805.033 | Word 上传解析改为「文字先出 + 图片异步补」（方案 A+D）；修复终态 Markdown 未回写实 URL 的问题 |
| v20260805.034 | Word 上传时 Markdown 区改用「图片占位符 + 待更新」替代冗长 base64；图片后台上传期间「生成排版」按钮自动禁用，避免内容未就绪就被提交 |
| v20260805.035 | 修复 v034 回归：解析进度提示改为受控内联状态条（彻底解决常驻不消失）；`finish()` 回写前统一清洗，任何残留 data:image 都转为整洁占位符，永不出现 base64 长串 |
| v20260805.036 | 增强 Word 图片上传错误诊断：客户端展示首条失败的具体原因（如「imgbb 服务异常 HTTP 503」），Cloudflare 侧识别 imgbb 维护页（非 JSON 响应）并给出明确提示；上传链路稳定性与速度提升 |
| v20260805.037 | Word 图片上传体验再打磨：占位文案统一为「图片占位。请在右上角配置「图片 API」后重传 Word 以自动上传图片」；无 Key 时 Markdown 区绝不再泄漏 base64；配置了 Key 后上传图片弹出全屏顶层进度遮罩（已完成 X / 共 Y 张），防止用户干等或误编辑 |
| v20260805.038 | 顶栏体验升级：图片 API / 模型 API 未配置时显示红色未读式角标（配置后自动消失）；右上角「源码」改为 GitHub 同款「Star」风格按钮（Octicons 星形 + Star 文案 + 实时 Star 数，点击直达仓库） |
| v20260805.039 | 修复 Word 图片占位文字截断与 Markdown base64 泄漏：占位 SVG 改为 100% 宽度 + 三行文字；富文本 → Markdown 全路径（手动转换、自动同步、粘贴/插入图片）均先清洗 data:image 再转 Markdown，中间编辑器绝不再出现 base64 长串；imgbb 上传附带 `name` 参数，便于图床管理文件名 |
| v20260806.001 | 替换被误删的 6 张主题预览图为 imgbb 新地址（纯资源地址修正，非功能调整） |
| v20260806.002 | imgbb 图床优化：上传通道免 base64（浏览器以二进制字节直传、服务端再包 multipart 转发 imgbb，省内存省带宽）；服务端对 imgbb 错误码做中文细分提示（限流 429 / Key 无效 / 超 32MB / 格式损坏 / 维护页），所有上传入口的错误更可读可操作 |
| v20260806.003 | 尝试把 CF→imgbb 改回 base64 字符串以绕开 502，但线上仍被 Cloudflare 平台层拦截（回归失败，仅记录） |
| v20260806.004 | **图片上传改浏览器直连 imgbb**，彻底解决 CF 代理 `/api/upload` 必 502：浏览器直接 POST 原字节 FormData 到 `https://api.imgbb.com/1/upload`（免 base64，BYOK key 本就在浏览器）；`data.data.url` 直链解析 + 错误码中文细分前置到前端；`functions/api/upload.ts` 标记 DEPRECATED |
| v20260806.005 | 多图 Word 上传限流防护：Word 图片上传改**并发受限队列**（最多 3 张同时）避免瞬时打满 imgbb 免费额度（约 30 张/分钟）；`uploadImageBytes` 增加 429/网络抖动**指数退避重试**（最多 4 次，仅限流重试、Key/体积/格式错误不重试），几十张图也能稳定传完 |
| v20260806.006 | 三栏布局改为「均衡优先」：右栏锁定 390px 手机视口并加手机外框（深色圆角边框 + 顶部听筒装饰），预览内文宽度降为手机比例（正文约 343px，1:1 还原微信手机端）；左栏富文本与中栏 Markdown 改为 `flex:1` 等分剩余空间；整行容器小屏触发横向滚动兜底，避免挤压三栏 |
| v20260806.007 | 回退三栏为等宽，手机预览改为「居中悬浮外框」：手机外框不再撑满右栏，而是在预览舞台内水平+垂直居中，四周留白；保留 390px 手机内容宽与顶部听筒装饰，视觉上更清爽、更像参考布局 |
| v20260806.008 | 优化手机外框：从 414px 粗黑边改为 390px 细边浅色卡片式外框（1px 浅灰边 + 柔和阴影），圆角从 30px 缩小到 24px，去掉固定 min-height，高度随内容自然变化，解决"小黑胖子"问题 |
| v20260806.009 | 去掉手机框内部独立滚动条：内容自然撑高手机外框，滚动统一交给右侧 `.preview-stage` 大滚动区；同步将 `scrollRef` 挂到舞台层，保持三栏滚动同步与流式生成自动滚底 |
| v20260806.010 | 空态手机框撑满预览区：`.phone-bezel` 空态时 `min-height:100%` 占满 `.preview-stage` 内容高度（上下由 stage padding 留白），`.phone-screen` 改 `flex:1` 填充剩余；有内容时仍自然撑高，不恢复内部滚动条 |
| v20260811.001 | 窄屏响应式优化（窗口 <1100px 时三栏由横排切换为纵向堆叠、每栏全宽，消除横向滚动）；深色模式预览切换（移植 wechatjs/mp-darkmode 算法）；修复模型保存双提示、Chrome 保存密码误提示、Word 图片 alt 带本地路径；Word 导入改用 convertToHtml 保真（富文本区显示真实加粗/标题样式）；富文本/预览标题栏窄屏自适应分行 |
| v20260811.002 | 手机端兼容优化：<480px 时 header 单行图标化（按钮文字隐藏只留图标、logo 只留 SVG、模型下拉只留头像）、Semi Modal 全宽（`width: calc(100vw - 32px)`）、Markdown 编辑器标题栏自适应分行 |
| v20260812.001 | **首屏体积优化**：Word 解析（mammoth 及 bluebird/@xmldom/dingbat/xmlbuilder 等依赖）与「分段贴图 ZIP 导出」的 jszip 改为**动态 import 懒加载**，仅在用户上传 Word / 导出贴图包时才下载对应 chunk；首屏主 bundle 由 1.11MB 降至约 620KB（gzip 325KB → 195KB），其余体积均转为按需异步 chunk，主界面加载与交互不变 |
| v20260812.002 | **API Key 输入框不再触发 Chrome 密码管理器**：imgbb Key / 模型 API KEY 输入框由 `type="password"` 改为 `type="text"` + `autoComplete="off"` + CSS `-webkit-text-security` 视觉圆点隐藏，DOM 层面不是密码框，Chrome 不再弹出「保存密码」或「新建密码」建议（此前 `new-password` 会导致两者反复骚扰）；imgbb Key 的「显示/隐藏」切换保留 |
| v20260812.003 | 功能统一：**模型 API KEY 输入框也增加「显示/隐藏」切换**（与 imgbb Key 一致，默认圆点隐藏、可切换明文查看，打开/编辑时重置为隐藏） |
| v20260812.004 | **参考图生成主题 + 模型视觉能力标记**：①模型管理新增「支持视觉 / 多模态」勾选（预设默认不预标，由用户按实际模型勾选），列表显示「视觉」标记；②自定义主题新增「上传参考图」创建方式——上传一张参考图（自动压缩为 JPEG、最长边 1200px），模型自动分析配色/风格/场景生成完整主题；③参考图模式走**浏览器直连多模态模型**（新增 `/api/theme-prompt` 取生成提示词 + `generateThemeByImage` 直连，绕开 Functions 30s 限制）；未勾选视觉的模型会阻止生成并提示到「模型管理」勾选 |
| v20260812.005 | 代码复查修复：①自定义主题向导的模型下拉中，支持视觉的模型显示绿色「视觉」标记（与模型管理一致，便于参考图模式选择）；②向导每次打开时同步最新选中的模型（组件常驻不再停留在旧选中项）；③参考图文件选择框重置 value，允许重复选择同一张图片再次触发上传 |
| v20260812.006 | **模型管理 + 自定义主题向导优化**：①通义千问「开通 API」注册地址更新为百炼控制台（`https://bailian.console.aliyun.com/?tab=model#/api-key`，Base URL 不变）；②模型管理「支持视觉 / 多模态」文案精简为「支持图片」（附小字说明），避免换行；③点击主题栏「自定义主题」卡片未生成时，直接打开向导不再弹冗余 Toast；④自定义主题弹窗改为**两个一级 Tab**——「文字描述生成主题」与「上传参考图生成主题」各自独立输入区，公共区（主题名称/生成模型/场景/生成按钮/预览）在下方，层级清晰不再混排 |
| v20260812.007 | 自定义主题向导「文字描述 / 上传参考图」两种方式改为**平分宽度的按钮组切换**（选中态高亮填充，与「风格」行的按钮样式一致），区分更清楚 |

> 每个版本均经真实浏览器（Chromium）挂载验证（无白屏、无报错）后，由 GitHub Actions 自动部署到 Cloudflare Pages。

## 源码声明（AGPL）

在线服务右上角的 GitHub 风格「Star」按钮指向本项目的 GitHub 仓库（已写入 `src/config.ts` 的 `REPO_URL`）。部署后任何人可通过该链接获取完整源代码。

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
