// POST /api/theme
// 自定义主题生成（skill 的 theme-generator 流程第 1~2 步）：
// 收集偏好 → 按 theme-generator.md 的【生成提示词】产出区块库 HTML 供整页预览。

import { chatCompletion, type ModelConfig } from '../../worker-lib/llm';
import { REFERENCES } from '../../worker-lib/skillAssets';

export const onRequestOptions: any = () => new Response(null, { headers: cors() });
export const onRequestPost = onRequestPostHandler;

async function onRequestPostHandler({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as any;
    const prefs: string = body.preferences || '';
    const model: ModelConfig = body.model;
    if (!model?.apiKey || !model?.baseUrl || !model?.model) {
      return json({ error: '模型配置不完整' }, 400);
    }
    const generator = REFERENCES['theme-generator.md'] || '';

    const system = `${generator}\n\n你只输出区块库 HTML（连续排布的所有 Block），不要解释、不要用 markdown 代码块围栏包裹。`;
    const user = `用户偏好：\n${prefs}\n\n请按文中【生成提示词】要求，产出 45~75 个 Block 的完整区块库 HTML，全部区块在同一页面连续排布，方便用户整页浏览确认风格。`;

    let html = await chatCompletion(model, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    html = html.trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

    return json({ html });
  } catch (e: any) {
    return json({ error: e?.message || '主题生成失败' }, 500);
  }
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
