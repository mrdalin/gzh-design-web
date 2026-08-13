// GET /api/theme-prompt
// 返回 theme-generator.md 的生成提示词全文（纯文本，无 LLM 调用）。
// 供「参考图生成主题」浏览器直连模式使用：前端拿到提示词后，
// 把参考图(base64)与偏好一起直连多模态模型，避免经 Functions 中转撞 30s 限制。
import { REFERENCES } from '../../worker-lib/skillAssets';

export const onRequestGet = onRequestGetHandler;

async function onRequestGetHandler(): Promise<Response> {
  const generator = REFERENCES['theme-generator.md'] || '';
  return new Response(JSON.stringify({ prompt: generator }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
