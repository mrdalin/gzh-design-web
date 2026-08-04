// POST /api/postprocess
// 轻量后处理：仅接收 HTML 做校验 + fixMarkdownResiduals，不调用 LLM。
// 供客户端直连模式使用（浏览器直接调 LLM 后把原始 HTML 发到这里做合规检查）。

import { validate } from '../../worker-lib/validate';

export const onRequestOptions: any = () => new Response(null, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
});

export async function onRequestPost({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as any;
    let html = body.html || '';

    if (!html.trim()) {
      return json({ error: 'HTML 不能为空' }, 400);
    }

    // 清理 Markdown 残留
    html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

    const result = validate(html);

    return json({ html, validation: result });
  } catch (e: any) {
    return json({ error: e?.message || '后处理失败' }, 500);
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
