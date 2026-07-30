// POST /api/layout
// 把文章（md/纯文本/docx）按所选主题排版为公众号 HTML。
// 流程：拼装提示词（SKILL.md + 主题组件库 + 通用库）→ 调 LLM → 强制合规校验 → 返回。

import { chatCompletion, type ModelConfig } from '../../worker-lib/llm';
import { validate } from '../../worker-lib/validate';
import { extractDocx } from '../../worker-lib/extractDocx';
import { getThemeComponentLib, getCommonComponents, getThemeById } from '../../worker-lib/themes';
import { SKILL_MD } from '../../worker-lib/skillAssets';
import { MOYU_GREEN_SAMPLE } from '../../worker-lib/sampleLayouts';

export const onRequestOptions: any = () => new Response(null, { headers: cors() });
export const onRequestPost = onRequestPostHandler;

async function onRequestPostHandler({ request }: { request: Request }) {
  try {
    let article = '';
    let themeId: string | undefined;
    let customLib: string | undefined;
    let model: ModelConfig | undefined;

    const ct = request.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (file && typeof file === 'object' && 'arrayBuffer' in (file as any)) {
        const f = file as File;
        const buf = await f.arrayBuffer();
        const fname = (f as File).name || '';
        if (fname.toLowerCase().endsWith('.docx')) {
          const ex = await extractDocx(buf);
          article = ex.markdown;
        } else {
          article = await f.text();
        }
      }
      themeId = (form.get('themeId') as string) || undefined;
      customLib = (form.get('customLib') as string) || undefined;
      model = JSON.parse((form.get('model') as string) || '{}');
    } else {
      const body = (await request.json()) as any;
      article = body.article || '';
      themeId = body.themeId;
      customLib = body.customLib;
      model = body.model;
    }

    if (!article || !article.trim()) {
      return json({ error: '缺少文章内容' }, 400);
    }
    if (!model || !model.apiKey || !model.baseUrl || !model.model) {
      return json({ error: '模型配置不完整（需要 API 地址 / KEY / 模型名）' }, 400);
    }

    const themeName = customLib ? '自定义主题' : getThemeById(themeId || '')?.name || '摸鱼绿';
    const lib = customLib || getThemeComponentLib(themeId || '');
    const common = getCommonComponents();

    const system = `${SKILL_MD}

# 排版约束（手机端公众号，容器宽度 ≤ 680px，必须严格遵守）
- 根容器只能有一个 <section>，不要额外套多层外层包裹；section 自身不要写死宽度，交给外层自适应。
- 严禁使用 position:absolute 或 position:fixed（会造成文字重叠、错位、丢失），需要装饰请用正常文档流或 position:relative + 合理留白。
- 严禁使用负 margin（如 margin-left:-12px）以及超出 680px 的固定宽度（如 width:1000px）；图片/视频统一 max-width:100%; height:auto。
- 所有元素 box-sizing 视为 border-box。
- 横向并排（多列/卡片）一律用 display:flex 且 flex-wrap:wrap，子项加 min-width:0 防止撑破，不要给子项写死大宽度。
- 字号 14–18px，行高 1.6–1.9，适合手机阅读；不要用超大字号撑破容器。
- 不要用 table 做复杂布局；如必须用表格，必须 table-layout:fixed; width:100%。
- 代码块、长链接等可能很宽的内容要使用 overflow-x:auto 或 word-break，绝不能把页面整体撑出横向滚动条。
- 整体在任意手机宽度下都不应出现横向滚动条或内容被裁切。
- 不要使用 <script>，不要用会触发微信拦截的外链跳转。

# 标准排版样例（摸鱼绿主题，供结构与风格参考）
以下是一份该主题的标准排版样例，请严格模仿其整体结构、章节样式、组件用法与排版密度（封面 → 目录 → 引言卡片 → 分章「大号数字编号 + PART 标签 + 章节标题 + 英文副标」→ 正文段落「关键词下划线高亮 + 重点词主色加粗」→ 引用/说明卡片 → 圆角标签要点列表 → 表格「绿头斑马纹」→ 金句卡片 → 结语 → 署名 → 互动三连）：
${MOYU_GREEN_SAMPLE}
注意：配色请改用当前主题「${themeName}」的主色；该样例仅用于学习结构与风格，你必须基于「需要排版的文章」的实际内容重新排版，不得照抄样例文字。

# 内容完整性要求（必须严格遵守，否则视为失败）
- 必须完整呈现原文的所有章节与要点，不得省略、不得只保留标题或每节第一句话；正文按原文顺序连续展开。
- 允许参考样例的丰富结构（封面、目录、金句、表格、署名、互动区）并在原文基础上适度扩写使科普更完整；但核心事实与数据须以原文为依据，不要无中生有地编造具体人名、机构或离谱数字。
- 主题组件库里的卡片/分块组件用于装饰小节标题或突出重点，不能替代正文段落；正文段落使用普通 <p>、<blockquote>、<ul>/<ol> 等文档流元素完整呈现。
- 输出必须是纯 HTML，不能残留任何 Markdown 语法（如 **粗体**、*斜体*、# 标题、- 列表等）。
- 优先保证所有文字都完整输出，绝不允许截断正文；如果内容较长，宁可保留全部文字、减少装饰，也不能让文章在中途断掉。

# 文字包裹规范（公众号粘贴必需，违反会丢字 / 乱码）
- 所有正文文字必须用「空 leaf」包裹：<span leaf="">这里是文字</span>。leaf 属性值必须是空字符串 ""，文字写在标签体里。
- 严禁写成 <span leaf="正文"></span>（把文字塞进 leaf 属性、标签体留空）。这种写法粘贴到公众号后文字会丢失，且正文中一旦包含引号就会破坏整个 HTML 结构。
- <strong>/<em>/<span 装饰> 等内联标签内的文字，也要保证落在 <span leaf="">体内，例如：<strong style="color:#e11d48;"><span leaf="">重点词</span></strong>。
- 图片、分隔线等无文字元素除外，但凡有可见文字就必须有 <span leaf=""> 包裹。

# 输出要求
只输出最终公众号正文 HTML 片段（从 <section> 开始到 </section> 结束），不要包含 <!DOCTYPE>/<html>/<head>/<body>，不要任何解释文字，不要用 markdown 代码块围栏包裹。`;

    const user = `请使用主题「${themeName}」排版以下文章。\n\n该主题的组件库如下（具体 HTML 一律从中取用，不要凭记忆手写）：\n\n${lib}\n\n通用增量库（代码块 / 图片·GIF / 小标签标题，所有主题共用，请套用本主题主色）：\n\n${common}\n\n需要排版的文章：\n\n${article}`;

    let html = await chatCompletion(model, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    html = stripFences(html);
    html = fixLeafSpans(html);

    let result = validate(html);
    // 一次自动纠正重试
    if (result.errors.length > 0) {
      const fix = await chatCompletion(model, [
        { role: 'system', content: system },
        { role: 'user', content: user },
        {
          role: 'assistant',
          content: html,
        },
        {
          role: 'user',
          content: `你的输出违反了以下公众号平台限制，请修正后只输出合规 HTML 片段：\n${result.errors.join('\n')}`,
        },
      ]);
      let fixed = stripFences(fix);
      fixed = fixLeafSpans(fixed);
      const r2 = validate(fixed);
      if (r2.errors.length <= result.errors.length) {
        html = fixed;
        result = r2;
      }
    }

    // 最终兜底：清理残留的 Markdown 语法（目录/扩写是允许的，不在此移除）
    html = fixMarkdownResiduals(html);
    result = validate(html);

    return json({
      html,
      title: deriveTitle(article),
      validation: result,
    });
  } catch (e: any) {
    return json({ error: e?.message || '排版失败' }, 500);
  }
}

// 兜底修复：模型常把正文塞进 <span leaf="正文"> 的属性里（标签体反而空）。
// 这种写法粘贴到公众号会丢字，且正文含引号时破坏整段 HTML。这里把属性值移回标签体。
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

// 兜底转换：模型偶尔输出 Markdown 语法残留（如 **粗体**、*斜体*）。
function fixMarkdownResiduals(html: string): string {
  let s = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  return s;
}

function stripFences(s: string): string {
  s = s.trim();
  const fence = s.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  // 去掉可能的 <!DOCTYPE>/<html> 外壳
  s = s.replace(/^[\s\S]*?(<section[\s\S]*<\/section>)[\s\S]*$/i, '$1');
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

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}
