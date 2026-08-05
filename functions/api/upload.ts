// POST /api/upload
// 图床代理：把用户上传的图片转发到 imgbb（用户自带 key，BYOK），返回可访问 URL。
// 经 Worker 代理以避免浏览器直连 imgbb 的 CORS 问题，且 key 仅本次请求使用。
//
// 入站统一用 JSON（image 为 base64 data URL），避免 Cloudflare Pages Functions
// 的 request.formData() 无法解析浏览器 multipart 的问题。出站到 imgbb 仍用 multipart。

export const onRequestOptions: any = () => new Response(null, { headers: cors() });
export const onRequestPost = onRequestPostHandler;

async function onRequestPostHandler({ request }: { request: Request }) {
  try {
    const body: any = await request.json();
    const imageB64: string | null = body.image || null;
    const key: string | null = body.key || null;
    const expiration: number | null = body.expiration || null;

    if (!imageB64) return json({ error: '缺少图片文件' }, 400);
    if (!key) return json({ error: '缺少 imgbb API key' }, 400);

    // strip data URL prefix（前端 readAsDataURL 会带上 "data:image/xxx;base64," 前缀，
    // imgbb 只接受纯 base64 字符串，否则返回 code 120 Invalid base64 string）
    const rawB64 = imageB64.replace(/^data:[^;]+;base64,/, '');
    const fd = new FormData();
    fd.append('image', rawB64);

    const imgbbUrl =
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}` +
      (expiration && expiration > 0 ? `&expiration=${Math.floor(expiration)}` : '');
    const resp = await fetch(imgbbUrl, {
      method: 'POST',
      body: fd,
    });

    // imgbb 服务异常时可能返回 HTML（如 503 维护页），直接 resp.json() 会抛解析错误
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const bodyText = (await resp.text()).slice(0, 200);
      return json({ error: `imgbb 服务异常（HTTP ${resp.status}，非 JSON 响应）：${bodyText.replace(/\s+/g, ' ')}` }, 502);
    }

    const data: any = await resp.json();
    if (!data?.success) {
      return json({ error: 'imgbb 上传失败：' + JSON.stringify(data?.error || `HTTP ${resp.status}`) }, 502);
    }
    return json({ url: data.data.url, deleteUrl: data.data.delete_url, thumb: data.data.thumb?.url });
  } catch (e: any) {
    return json({ error: e?.message || '上传失败' }, 500);
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
