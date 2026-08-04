// POST /api/layout
// 把文章（md/纯文本/docx）按所选主题排版为公众号 HTML。
// 流程：拼装提示词（SKILL.md + 主题组件库 + 通用库）→ 调 LLM → 强制合规校验 → 返回。

import { chatCompletion, type ModelConfig } from '../../worker-lib/llm';
import { validate } from '../../worker-lib/validate';
import { extractDocx } from '../../worker-lib/extractDocx';
import { getThemeComponentLib, getCommonComponents, getThemeById } from '../../worker-lib/themes';
import { SKILL_MD } from '../../worker-lib/skillAssets';
import { LAYOUT_STYLE_GUIDE } from '../../worker-lib/layoutStyle';

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

# ⚠️ 最高优先级：排版保真原则（必须严格遵守）
你的任务只有「排版」，没有「改写」。违反以下任意一条即视为排版失败：
- 不删除：原文的每一个字、每一句话、每一个标点都必须保留，不得省略，不得只保留标题或每节第一句话。
- 不增补：不得添加原文没有的内容，不得扩写、不得编造例子 / 数据 / 人名 / 机构 / 金句。
- 不润色：不得改写原文词句、不得调整语序、不得改变表述风格或语气。
- 只排版：仅根据所选主题，调整 Markdown/HTML 的排版结构——标题层级、重点加粗 / 下划线、引用卡片、列表样式、表格样式、配色与装饰组件等。
原文是唯一的权威。若某段原文看起来不够「漂亮」，宁可保留原文措辞只做结构美化，也绝不可改动文字内容。封面、目录、署名、互动引导等属于主题「版式骨架」，可沿用主题既定结构，但不得在其中夹带新的正文观点或对原文做总结改写。

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

# 排版结构方案（参考「摸鱼绿」风格提炼，须严格遵循）
${LAYOUT_STYLE_GUIDE}
注意：以上方案基于「摸鱼绿」风格提炼，配色请改用当前主题「${themeName}」的主色；你必须基于「需要排版的文章」的实际内容重新排版，不得虚构章节与数据，也不得照抄任何样例文字。

# 内容完整性要求（必须严格遵守，否则视为失败）
- 必须 1:1 完整呈现原文的所有章节与要点，顺序不变、文字不变；正文段落使用普通 <p>、<blockquote>、<ul>/<ol> 等文档流元素原样承载，一字不漏。
- 主题组件库里的卡片/分块组件仅用于「结构美化与重点标注」（如给小节加标题卡片、把要点做成标签列表、用引用卡片突出原文已有的说明），不能替代或改写正文段落，不得在其中添加原文没有的内容。
- 输出必须是纯 HTML，不能残留任何 Markdown 语法（如 **粗体**、*斜体*、# 标题、- 列表等）。
- 优先保证所有文字都完整输出且与原文逐字一致，绝不允许截断、遗漏或改动正文。

# 文字包裹规范（公众号粘贴必需，违反会丢字 / 乱码）
- 所有正文文字必须用「空 leaf」包裹：<span leaf="">这里是文字</span>。leaf 属性值必须是空字符串 ""，文字写在标签体里。
- 严禁写成 <span leaf="正文"></span>（把文字塞进 leaf 属性、标签体留空）。这种写法粘贴到公众号后文字会丢失，且正文中一旦包含引号就会破坏整个 HTML 结构。
- <strong>/<em>/<span 装饰> 等内联标签内的文字，也要保证落在 <span leaf="">体内，例如：<strong style="color:#e11d48;"><span leaf="">重点词</span></strong>。
- 图片、分隔线等无文字元素除外，但凡有可见文字就必须有 <span leaf=""> 包裹。

# 输出要求
只输出最终公众号正文 HTML 片段（从 <section> 开始到 </section> 结束），不要包含 <!DOCTYPE>/<html>/<head>/<body>，不要任何解释文字，不要用 markdown 代码块围栏包裹。
- 不增不减原则：输出要紧凑务实，但正文文字必须与原文逐字一致——既不删减原文，也不额外添加解释、评注或总结。装饰组件（卡片/表格/金句）每个章节最多 1-2 个，用于突出原文已有内容即可，不用每段都加。`;

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
      // 拒绝空结果：空串通过 validate 会得 0 错误（无 CJK 内容不触发 leaf 检查），
      // 若不排除，空串会"赢"过首轮正常 HTML 并导致预览清空。
      if (fixed.trim() && r2.errors.length <= result.errors.length) {
        html = fixed;
        result = r2;
      }
    }

    // 最终兜底：清理残留的 Markdown 语法（目录/扩写是允许的，不在此移除）
    html = fixMarkdownResiduals(html);
    result = validate(html);

    // 最终兜底：若 html 为空（模型返回空 / stripFences 抹空 / 全被重试拒绝），
    // 返回错误而非静默传回空字符串（前端会清空预览且无任何提示）。
    if (!html || !html.trim()) {
      return json({ error: '模型返回空内容，请重试或更换模型' }, 502);
    }

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
