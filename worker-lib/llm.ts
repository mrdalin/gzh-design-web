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

  // 为 LLM 调用设置独立超时（120s），防止 Cloudflare Pages Functions 因长时间等待被杀
  // 导致浏览器收到 "Failed to fetch" 网络断连错误。
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  // 如果外部传入了 signal，则任一 signal abort 都触发取消
  opts?.signal?.addEventListener('abort', () => controller.abort(), { once: true });

  let resp: Response;
  try {
    resp = await fetch(url, {
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
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('模型响应超时（120秒无响应），请重试或换更快的模型');
    throw new Error(`无法连接模型服务 (${err.message})`);
  }
  clearTimeout(timeout);
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`LLM 请求失败 (${resp.status}): ${errText.slice(0, 400)}`);
  }
  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  // 某些模型（尤其是推理模型）可能把正文放 reasoning_content 或直接返回空
  if (!content || !content.trim()) {
    throw new Error('模型返回空内容（可能 max_tokens 超出模型上限，或模型不支持该请求格式），请尝试降低 max_tokens 或更换模型');
  }
  return content;
}
