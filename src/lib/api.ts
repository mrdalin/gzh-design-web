import type { LayoutResult, ModelConfig, Theme } from '../types';

// 同源调用 Cloudflare Pages Functions（/api/*）。
// 本地开发请使用 `npm run pages:dev`（wrangler 同时托管 dist 与 functions），
// 此时 /api/* 也能被解析；纯 `vite dev` 不会提供函数路由。

// ─── 浏览器端直接调用 OpenAI 兼容 LLM（绕过 CF Functions 超时限制）────────
async function callLLMDirect(
  model: ModelConfig,
  messages: { role: string; content: string }[],
  opts?: { maxTokens?: number }
): Promise<string> {
  const base = model.baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages,
        temperature: 0.7,
        max_tokens: opts?.maxTokens ?? 32768,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`LLM 错误 (${resp.status}): ${errText.slice(0, 300)}`);
    }
    const data: any = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (!content?.trim()) throw new Error('模型返回空内容，请重试或更换模型');
    return content;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('模型响应超时（180秒），请缩短文章或换更快的模型');
    throw err;
  }
}

// ─── 简单的 HTML 后处理（与后端 layout.ts 保持一致）────────────────────────
function stripFences(s: string): string {
  s = s.trim();
  const fence = s.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  s = s.replace(/^[\s\S]*?(<section[\s\S]*<\/section>)[\s\S]*$/i, '$1');
  return s;
}

function fixLeafSpans(html: string): string {
  return html.replace(
    /<span\b([^>]*?)\sleaf="([^"<]*)"([^>]*)>\s*<\/span>/gi,
    (_m, before: string, val: string, after: string) => {
      const attrs = (before + after).replace(/\s*leaf="[^"]*"/i, '').trim();
      const open = attrs ? `<span ${attrs} leaf="">` : '<span leaf="">';
      return `${open}${val}</span>`;
    }
  );
}

function fixMarkdownResiduals(html: string): string {
  let s = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  return s;
}

function deriveTitle(article: string): string {
  const lines = article.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    const h = l.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim();
    if (h) return h.slice(0, 60);
  }
  return '未命名排版';
}

// ─── 客户端直连模式：浏览器直接调 LLM，本地后处理，最后交服务端校验 ────
// ─── 流式相关：浏览器端直连 + SSE 解析 ─────────────────────────────────────
// 生成过程中实时清理（去掉引导 ``` 围栏、抽取 <section>、修复 leaf 包裹），
// 用于预览区「边生成边显示」的 live 效果。幂等，可重复调用。
export function liveClean(s: string): string {
  s = s.replace(/^\s*```(?:html)?\s*/i, '');
  s = stripFences(s);
  s = fixLeafSpans(s);
  return s;
}

// 提示词与 layoutClientSide 共用，避免两处漂移。
function buildLayoutPrompt(params: {
  article: string;
  themeId?: string;
  customLib?: string;
  themes: Theme[];
}): { system: string; user: string } {
  const theme = params.themes.find((t) => t.id === params.themeId);
  const themeName = params.customLib ? '自定义主题' : theme?.name || '摸鱼绿';
  const lib = params.customLib || theme?.componentLib || '';
  const common = params.themes[0]?.commonComponents || '';

  const system = [
    `# ⚠️ 最高优先级：排版保真原则（必须严格遵守）
你的任务只有「排版」，没有「改写」。违反以下任意一条即视为排版失败：
- 不删除：原文的每一个字、每一句话、每一个标点都必须保留，不得省略，不得只保留标题或每节第一句话。
- 不增补：不得添加原文没有的内容，不得扩写、不得编造例子 / 数据 / 人名 / 机构 / 金句。
- 不润色：不得改写原文词句、不得调整语序、不得改变表述风格或语气。
- 只排版：仅根据所选主题，调整 Markdown/HTML 的排版结构——标题层级、重点加粗 / 下划线、引用卡片、列表样式、表格样式、配色与装饰组件等。
原文是唯一的权威。若某段原文看起来不够「漂亮」，宁可保留原文措辞只做结构美化，也绝不可改动文字内容。封面、目录、署名、互动引导等属于主题「版式骨架」，可沿用主题既定结构，但不得在其中夹带新的正文观点或对原文做总结改写。`,
    `# 排版约束（手机端公众号，容器宽度 ≤ 680px，必须严格遵守）
- 根容器只能有一个 <section>，不要额外套多层外层包裹；section 自身不要写死宽度，交给外层自适应。
- 严禁使用 position:absolute 或 position:fixed（会造成文字重叠、错位、丢失），需要装饰请用正常文档流或 position:relative + 合理留白。
- 严禁使用负 margin（如 margin-left:-12px）以及超出 680px 的固定宽度（如 width:1000px）；图片/视频统一 max-width:100%; height:auto。
- 所有元素 box-sizing 视为 border-box。
- 横向并排（多列/卡片）一律用 display:flex 且 flex-wrap:wrap，子项加 min-width:0 防止撑破，不要给子项写死大宽度。
- 字号 14–18px，行高 1.6–1.9，适合手机阅读；不要用超大字号撑破容器。
- 不要用 table 做复杂布局；如必须用表格，必须 table-layout:fixed; width:100%。
- 代码块、长链接等可能很宽的内容要使用 overflow-x:auto 或 word-break，绝不能把页面整体撑出横向滚动条。
- 整体在任意手机宽度下都不应出现横向滚动条或内容被裁切。
- 不要使用 <script>，不要用会触发微信拦截的外链跳转。`,
    `# 排版结构方案（参考「摸鱼绿」风格提炼，须严格遵循）
- 封面区：大标题 + 副标题/摘要，主色渐变背景或带装饰边框
- 目录导航（可选）：横向滚动的 PART 卡片式目录，「📦 N Parts + 结语」格式
- 分章结构：每章用「大号数字编号 + PART 标签 + 章节标题 + 英文副标题」的卡片头部
- 正文段落：关键词用下划线高亮(u 标签)，重点词用主色加粗(strong + 主色)
- 引用/说明卡片：浅色背景(left-border)卡片用于补充说明、名词解释、数据强调
- 圆角标签要点列表：小圆角标签(inline-block)替代普通 ul/li，视觉更紧凑
- 表格：表头用主题主色背景白字，斑马纹行，紧凑内距
- 金句卡片：引用块样式，居中/半透明装饰，用于总结性语句
- 结语区：简短总结 + 感悟/展望
- 署名区：作者/来源/日期，小字灰色
- 互动三连：点赞/在看/分享引导，底部固定样式
注意：以上方案基于「摸鱼绿」风格提炼，配色请改用当前主题「${themeName}」的主色；你必须基于「需要排版的文章」的实际内容重新排版，不得虚构章节与数据，也不得照抄任何样例文字。`,
    `# 内容完整性要求（必须严格遵守，否则视为失败）
- 必须 1:1 完整呈现原文的所有章节与要点，顺序不变、文字不变；正文段落使用普通 <p>、<blockquote>、<ul>/<ol> 等文档流元素原样承载，一字不漏。
- 主题组件库里的卡片/分块组件仅用于「结构美化与重点标注」（如给小节加标题卡片、把要点做成标签列表、用引用卡片突出原文已有的说明），不能替代或改写正文段落，不得在其中添加原文没有的内容。
- 输出必须是纯 HTML，不能残留任何 Markdown 语法（如 **粗体**、*斜体*、# 标题、- 列表等）。
- 优先保证所有文字都完整输出且与原文逐字一致，绝不允许截断、遗漏或改动正文。`,
    `# 文字包裹规范（公众号粘贴必需，违反会丢字 / 乱码）
- 所有正文文字必须用「空 leaf」包裹：<span leaf="">这里是文字</span>。leaf 属性值必须是空字符串 ""，文字写在标签体里。
- 严禁写成 <span leaf="正文"></span>（把文字塞进 leaf 属性、标签体留空）。这种写法粘贴到公众号后文字会丢失，且正文中一旦包含引号就会破坏整个 HTML 结构。
- <strong>/<em>/<span 装饰> 等内联标签内的文字，也要保证落在 <span leaf="">体内，例如：<strong style="color:#e11d48;"><span leaf="">重点词</span></strong>。
- 图片、分隔线等无文字元素除外，但凡有可见文字就必须有 <span leaf=""> 包裹。`,
    `# 输出要求
只输出最终公众号正文 HTML 片段（从 <section> 开始到 </section> 结束），不要包含 <!DOCTYPE>/<html>/<head>/<body>，不要任何解释文字，不要用 markdown 代码块围栏包裹。
- 不增不减原则：输出要紧凑务实，但正文文字必须与原文逐字一致——既不删减原文，也不额外添加解释、评注或总结。装饰组件（卡片/表格/金句）每个章节最多 1-2 个，用于突出原文已有内容即可，不用每段都加。`,
  ].join('\n\n');

  const user = `请使用主题「${themeName}」排版以下文章。\n\n该主题的组件库如下（具体 HTML 一律从中取用，不要凭记忆手写）：\n\n${lib}\n\n通用增量库（代码块 / 图片·GIF / 小标签标题，所有主题共用，请套用本主题主色）：\n\n${common}\n\n需要排版的文章：\n\n${params.article}`;

  return { system, user };
}

// 流式调用 OpenAI 兼容接口（SSE）。通过回调实时上报首 token / 增量内容 / token 用量。
async function callLLMStream(
  model: ModelConfig,
  messages: { role: string; content: string }[],
  handlers?: {
    onFirstToken?: () => void;
    onChunk?: (full: string) => void;
    onUsage?: (u: { prompt_tokens: number; completion_tokens: number }) => void;
    signal?: AbortSignal;
  },
  opts?: { maxTokens?: number }
): Promise<string> {
  const base = model.baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  const signal = handlers?.signal ?? controller.signal;
  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages,
        temperature: 0.7,
        max_tokens: opts?.maxTokens ?? 32768,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`LLM 错误 (${resp.status}): ${errText.slice(0, 300)}`);
    }
    if (!resp.body) throw new Error('模型未返回流式数据');
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let first = true;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') break;
        try {
          const json: any = JSON.parse(data);
          if (json.usage) handlers?.onUsage?.(json.usage);
          const delta = json?.choices?.[0]?.delta?.content || '';
          if (delta) {
            if (first) {
              first = false;
              handlers?.onFirstToken?.();
            }
            full += delta;
            handlers?.onChunk?.(full);
          }
        } catch {
          // 忽略无法解析的分片（部分服务会发注释/心跳）
        }
      }
    }
    if (!full.trim()) throw new Error('模型返回空内容，请重试或更换模型');
    return full;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('模型响应超时（180秒），请缩短文章或换更快的模型');
    throw err;
  }
}

// 客户端直连（流式版）：浏览器直接调 LLM 并实时回传进度，结束后本地后处理 + 服务端校验。
export async function layoutClientSideStream(
  params: {
    article: string;
    themeId?: string;
    customLib?: string;
    model: ModelConfig;
    themes: Theme[];
  },
  handlers?: {
    onFirstToken?: () => void;
    onChunk?: (full: string) => void;
    onUsage?: (u: { prompt_tokens: number; completion_tokens: number }) => void;
    signal?: AbortSignal;
  }
): Promise<LayoutResult> {
  const { system, user } = buildLayoutPrompt(params);
  const raw = await callLLMStream(
    params.model,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    handlers
  );
  console.log('[客户端直连·流] LLM 返回, 原始长度:', raw.length);

  let html = stripFences(raw);
  html = fixLeafSpans(html);
  html = fixMarkdownResiduals(html);

  const postResp = await fetch('/api/postprocess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html }),
  });
  if (!postResp.ok) {
    console.warn('[客户端直连·流] /api/postprocess 不可用, 使用本地结果');
    return { html, title: deriveTitle(params.article), validation: { errors: [], warnings: [], leafCount: 0 } };
  }
  const postData: any = await postResp.json();
  return {
    html: postData.html || html,
    title: deriveTitle(params.article),
    validation: postData.validation || { errors: [], warnings: [], leafCount: 0 },
  };
}

export async function layoutClientSide(params: {
  article: string;
  themeId?: string;
  customLib?: string;
  model: ModelConfig;
  themes: Theme[];
}): Promise<LayoutResult> {
  const { system, user } = buildLayoutPrompt(params);



  console.log('[客户端直连] 开始调用 LLM', { model: params.model.model, baseUrl: params.model.baseUrl, articleLen: params.article.length });

  // 3) 浏览器直接调 LLM（无 CF 超时限制）
  let html = await callLLMDirect(params.model, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  console.log('[客户端直连] LLM 返回, 原始长度:', html.length);

  // 4) 本地后处理（与后端一致）
  html = stripFences(html);
  html = fixLeafSpans(html);

  // 5) 交服务端做最终校验（轻量操作，不会超时）
  const postResp = await fetch('/api/postprocess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html }),
  });
  if (!postResp.ok) {
    // 服务端校验失败时不阻断，用本地结果兜底
    console.warn('[客户端直连] /api/postprocess 不可用, 使用本地结果');
    return { html, title: deriveTitle(params.article), validation: { errors: [], warnings: [], leafCount: 0 } };
  }
  const postData: any = await postResp.json();
  return {
    html: postData.html || html,
    title: deriveTitle(params.article),
    validation: postData.validation || { errors: [], warnings: [], leafCount: 0 },
  };
}

export async function fetchThemes(): Promise<{ themes: Theme[]; commonComponents: string }> {
  const res = await fetch('/api/themes');
  if (!res.ok) throw new Error('加载主题列表失败');
  const data: any = await res.json();
  return { themes: (data.themes as Theme[]) || [], commonComponents: data.commonComponents || '' };
}

export async function layout(params: {
  article?: string;
  themeId?: string;
  customLib?: string;
  model: ModelConfig;
}): Promise<LayoutResult> {
  // 注意：Cloudflare Pages Functions 的 request.formData() 在此环境无法正确解析
  // 浏览器提交的 multipart/form-data（article 字段会丢失），因此统一改用 JSON。
  // 前端超时保护：Cloudflare Pages Functions 有执行时间限制，长文排版可能耗时较长。
  // 设 180s 超时，超时后给出明确提示而非无限等待或 "Failed to fetch"。
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);

  let res: Response;
  try {
    res = await fetch('/api/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article: params.article || '',
        themeId: params.themeId,
        customLib: params.customLib,
        model: params.model,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('排版请求超时（3分钟无响应），请重试或缩短文章后重试');
    throw new Error(`网络请求失败（${err.message}），请检查网络连接`);
  }
  clearTimeout(timeout);
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '排版失败');
  if (!data?.html?.trim()) throw new Error('服务端返回空排版结果，请重试或更换模型');
  return data as LayoutResult;
}

// ─── 图片上传（浏览器直连 imgbb，绕过 Cloudflare Pages Functions 代理）────
//
// 为什么不做 CF 代理 /api/upload：
//   Cloudflare Pages Functions 的出口 fetch 到 api.imgbb.com 会被平台层整体拦截
//   （返回纯文本 error code: 502，连函数内 catch 都跑不到），任何改写（base64 /
//   Blob / JSON）都无法绕开。而 imgbb 响应带 Access-Control-Allow-Origin: *，
//   BYOK key 本就只存在浏览器 localStorage，因此浏览器可直接 POST 到 imgbb，
//   既彻底避开 502，又免 base64（用原始字节 FormData）、省带宽。
//
//   functions/api/upload.ts 已废弃（保留仅供回溯），前端不再调用。

// 把 imgbb 的错误码 / 信息翻译成可读、可操作的中文提示（含限流、Key、体积、格式等）。
function formatImgbbError(data: any, httpStatus: number): string {
  const err = data?.error || {};
  const code = err.code;
  const msg: string = (err.message || '').toLowerCase();
  const raw = data?.status ? `（HTTP ${data.status}）` : `（HTTP ${httpStatus}）`;
  if (httpStatus === 429 || /rate|limit|too many|quota/i.test(msg)) {
    return `图片上传过于频繁，imgbb 已限流${raw}。请稍候 1–2 分钟再试；如需更高额度可在 imgbb 升级套餐。`;
  }
  if (code === 100 || /api key|api_key|key is required|invalid api/i.test(msg)) {
    return `imgbb API Key 无效或未填写${raw}：请到右上角「图片 API」检查或更换 Key（注意区分 v1 key 与匿名上传）。`;
  }
  if (code === 121) return `图片超过 imgbb 32MB 上限${raw}，请压缩后重试。`;
  if (code === 120 || /base64|invalid image format/i.test(msg)) return `图片数据无效（imgbb 报 ${code ?? '格式错误'}）${raw}，请重新选择图片。`;
  if (code === 122 || code === 123 || code === 124) return `图片格式不受支持或文件已损坏${raw}，请换一张图片（建议 PNG/JPG/GIF/WebP）。`;
  if (code === 125) return `图片文件名格式不合法${raw}，请修改文件名后重试。`;
  const detail = err.message ? `：${err.message}` : '';
  return `imgbb 上传失败${raw}${detail}`;
}

// 简单延时（用于限流/网络抖动的退避重试）
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 核心上传：浏览器直接以原始字节（Blob）POST 到 imgbb，免 base64。
// 内置限流/网络抖动重试：imgbb 免费额度约 30 张/分钟，多图并发可能触发 429，
// 这里在 429 或网络异常时指数退避重试（最多 4 次），避免一次性多图上传大量失败。
export async function uploadImageBytes(
  bytes: Uint8Array | ArrayBuffer,
  mime: string,
  key: string,
  expiration?: number,
  name?: string
): Promise<{ url: string; deleteUrl?: string; thumb?: string }> {
  if (!key?.trim()) throw new Error('请先在右上角「图片 API」填写 imgbb Key 后再上传图片');
  const qs = new URLSearchParams();
  qs.set('key', key.trim());
  if (name) qs.set('name', name);
  if (expiration && expiration > 0) qs.set('expiration', String(Math.floor(expiration)));

  const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
  const fd = new FormData();
  fd.append('image', blob, name || 'image');

  const MAX_ATTEMPTS = 4;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(`https://api.imgbb.com/1/upload?${qs.toString()}`, {
        method: 'POST',
        body: fd,
      });
    } catch (e: any) {
      // 网络抖动：退避后重试
      lastErr = new Error(`无法连接 imgbb（${e?.message || '网络错误'}），请检查网络后重试`);
      if (attempt < MAX_ATTEMPTS) { await sleep(1200 * attempt); continue; }
      throw lastErr;
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      // 非 JSON（维护页等）不重试，直接报错
      throw new Error(`imgbb 服务异常（HTTP ${res.status}），请稍后重试`);
    }
    const data: any = await res.json();
    if (!data?.success) {
      const msg = formatImgbbError(data, res.status);
      // 仅限流（429）重试：等更久一点再试；其余错误（Key/体积/格式）不重试
      if (res.status === 429 || /限流/.test(msg)) {
        lastErr = new Error(msg);
        if (attempt < MAX_ATTEMPTS) { await sleep(1500 * attempt); continue; }
      }
      throw new Error(msg);
    }
    return { url: data.data.url, deleteUrl: data.data.delete_url, thumb: data.data.thumb?.url };
  }
  throw lastErr ?? new Error('图片上传失败');
}

// 复用上传逻辑：调用方已持有 base64（可能带或不带 data URL 前缀）。
// 这里把 base64 解码成字节后走浏览器直连 imgbb（免 base64 传输）。
export async function uploadImageB64(
  base64: string,
  key: string,
  expiration?: number,
  name?: string,
  mime: string = 'image/png'
): Promise<{ url: string; deleteUrl?: string; thumb?: string }> {
  const m = base64.match(/^data:([^;]+);base64,(.*)$/s);
  const ct = m ? m[1] : mime;
  const raw = m ? m[2] : base64; // 无前缀时当作纯 base64
  const bin = atob(raw);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return uploadImageBytes(arr, ct, key, expiration, name);
}

export async function uploadImage(
  file: File,
  key: string,
  expiration?: number
): Promise<{ url: string; deleteUrl?: string; thumb?: string }> {
  // 直接取文件原始字节走浏览器直连 imgbb（免 base64 编码）。
  const bytes = await file.arrayBuffer();
  return uploadImageBytes(bytes, file.type || 'application/octet-stream', key, expiration, file.name);
}

export async function generateTheme(
  prefs: string,
  model: ModelConfig
): Promise<{ html: string }> {
  const res = await fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences: prefs, model }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '主题生成失败');
  return data;
}

export async function generateArticle(
  prompt: string,
  model: ModelConfig
): Promise<{ article: string }> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '文案生成失败');
  return data;
}
