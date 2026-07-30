// OpenAI 兼容的聊天补全客户端（DeepSeek / Kimi / 任意自定义 OpenAI 兼容端点通用）。
// 在 Cloudflare Worker 中通过全局 fetch 调用，key 仅在本次请求中使用，不落库。

export interface ModelConfig {
  id?: string;
  displayName?: string;
  baseUrl: string; // 形如 https://api.deepseek.com/v1
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  cfg: ModelConfig,
  messages: ChatMessage[],
  opts?: { temperature?: number; signal?: AbortSignal }
): Promise<string> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: 32768,
      stream: false,
    }),
    signal: opts?.signal,
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`LLM 请求失败 (${resp.status}): ${errText.slice(0, 400)}`);
  }
  const data: any = await resp.json();
  return data?.choices?.[0]?.message?.content ?? '';
}
