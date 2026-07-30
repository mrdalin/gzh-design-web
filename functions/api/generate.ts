import { chatCompletion, type ModelConfig } from '../../worker-lib/llm';

interface GeneratePayload {
  prompt: string;
  model: ModelConfig;
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const onRequestOptions: any = () => new Response(null, { status: 204, headers: cors() });
export const onRequestPost = onRequestPostHandler;

async function onRequestPostHandler({ request }: { request: Request }) {
  try {
    const { prompt, model } = (await request.json()) as GeneratePayload;
    if (!prompt?.trim()) {
      return Response.json({ error: '提示词不能为空' }, { status: 400, headers: cors() });
    }
    if (!model?.baseUrl || !model?.apiKey || !model?.model) {
      return Response.json({ error: '模型配置不完整' }, { status: 400, headers: cors() });
    }

    const messages = [
      {
        role: 'system' as const,
        content:
          '你是一位微信公众号文案作者。请根据用户给出的提示词写一篇完整的公众号文章正文，直接返回正文内容，不要添加解释、总结或 Markdown 代码块围栏。可使用 Markdown 格式（# 标题、**加粗**、- 列表等）。',
      },
      { role: 'user' as const, content: prompt },
    ];

    const text = await chatCompletion(model, messages, { temperature: 0.7 });
    return Response.json({ article: text.trim() }, { headers: cors() });
  } catch (e: any) {
    return Response.json({ error: e?.message || '文案生成失败' }, { status: 500, headers: cors() });
  }
}
