// POST /api/layout
// 把文章（md/纯文本/docx）按所选主题排版为公众号 HTML。
// 流程：拼装提示词（SKILL.md + 主题组件库 + 通用库）→ 调 LLM → 强制合规校验 → 返回。

import { chatCompletion, type ModelConfig } from '../../worker-lib/llm';
import { validate } from '../../worker-lib/validate';
import { extractDocx } from '../../worker-lib/extractDocx';
import { getThemeComponentLib, getCommonComponents, getThemeById } from '../../worker-lib/themes';
import { SKILL_MD } from '../../worker-lib/skillAssets';

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

# 输出要求
只输出最终公众号正文 HTML 片段（从 <section> 开始到 </section> 结束），不要包含 <!DOCTYPE>/<html>/<head>/<body>，不要任何解释文字，不要用 markdown 代码块围栏包裹。`;

    const user = `请使用主题「${themeName}」排版以下文章。\n\n该主题的组件库如下（具体 HTML 一律从中取用，不要凭记忆手写）：\n\n${lib}\n\n通用增量库（代码块 / 图片·GIF / 小标签标题，所有主题共用，请套用本主题主色）：\n\n${common}\n\n需要排版的文章：\n\n${article}`;

    let html = await chatCompletion(model, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    html = stripFences(html);

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
      const fixed = stripFences(fix);
      const r2 = validate(fixed);
      if (r2.errors.length <= result.errors.length) {
        html = fixed;
        result = r2;
      }
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
