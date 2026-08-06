// POST /api/upload
// 图床代理：把用户上传的图片转发到 imgbb（用户自带 key，BYOK），返回可访问 URL。
// 经 Worker 代理以避免浏览器直连 imgbb 的 CORS 问题，且 key 仅本次请求使用。
//
// 入站支持两种格式：
//   1) 二进制（推荐，免 base64）：Content-Type 为图片 MIME，body 为图片原始字节，
//      key / name / expiration 走 query 参数。浏览器端 uploadImage/uploadImageBytes 走此路径。
//   2) JSON（兼容旧调用）：{ image: base64 data URL, key, name, expiration }。
// 出站到 imgbb 统一用 multipart（image 为二进制文件）。

export const onRequestOptions: any = () => new Response(null, { headers: cors() });
export const onRequestPost = onRequestPostHandler;

async function onRequestPostHandler({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const qKey = url.searchParams.get('key');
    const qName = url.searchParams.get('name');
    const qExpRaw = url.searchParams.get('expiration');
    const qExp = qExpRaw ? parseInt(qExpRaw, 10) : null;

    const contentType = (request.headers.get('content-type') || '').toLowerCase();

    let imageData: string; // 交给 imgbb 的 image 字段（base64 字符串；imgbb 接受且 CF→imgbb 最稳妥）
    let blobName: string | null = qName;
    let uploadKey: string;
    let uploadExp: number | null = null;

    if (contentType.includes('application/json')) {
      // 兼容旧路径：body 为 { image: base64 data URL, key, name, expiration }
      const body: any = await request.json();
      const imageB64: string | null = body.image || null;
      uploadKey = body.key || qKey || '';
      blobName = body.name || qName;
      uploadExp = body.expiration || qExp;
      if (!imageB64) return json({ error: '缺少图片文件' }, 400);
      if (!uploadKey) return json({ error: '缺少 imgbb API key' }, 400);
      // strip data URL prefix（imgbb 只接受纯 base64 字符串，否则返回 code 120）
      imageData = imageB64.replace(/^data:[^;]+;base64,/, '');
    } else {
      // 二进制路径：body 为图片原始字节（浏览器免 base64 直传）
      const buf = await request.arrayBuffer();
      if (!buf || buf.byteLength === 0) return json({ error: '缺少图片文件（空内容）' }, 400);
      uploadKey = qKey || '';
      uploadExp = qExp;
      if (!uploadKey) return json({ error: '缺少 imgbb API key' }, 400);
      // 转回 base64 字符串再交给 imgbb：imgbb 接受 base64，且 CF→imgbb 用 string 最稳妥
      // （浏览器→CF 这一段仍是二进制免 base64，传输收益保留）。分块转避免大图 O(n^2)。
      const bytes = new Uint8Array(buf);
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      imageData = btoa(binary);
    }

    const fd = new FormData();
    fd.append('image', imageData);
    if (blobName) fd.append('name', blobName);

    const imgbbUrl =
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(uploadKey)}` +
      (uploadExp && uploadExp > 0 ? `&expiration=${Math.floor(uploadExp)}` : '');
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
      const friendly = formatImgbbError(data, resp.status);
      return json({ error: friendly, code: data?.error?.code ?? null, status: resp.status }, 502);
    }
    return json({ url: data.data.url, deleteUrl: data.data.delete_url, thumb: data.data.thumb?.url });
  } catch (e: any) {
    return json({ error: e?.message || '上传失败' }, 500);
  }
}

// 把 imgbb 的错误码 / 信息翻译成可读、可操作的中文提示（含限流、Key、体积、格式等细分）。
function formatImgbbError(data: any, httpStatus: number): string {
  const err = data?.error || {};
  const code = err.code;
  const msg: string = (err.message || '').toLowerCase();
  const raw = data?.status ? `（HTTP ${data.status}）` : `（HTTP ${httpStatus}）`;

  // 限流（imgbb 免费额度约每分钟 30 张 / 每小时 240 张，超额返回 429 或在 message 里提示）
  if (httpStatus === 429 || /rate|limit|too many|quota/i.test(msg)) {
    return `图片上传过于频繁，imgbb 已限流${raw}。请稍候 1–2 分钟再试；如需更高额度可在 imgbb 升级套餐。`;
  }
  // Key 相关
  if (code === 100 || /api key|api_key|key is required|invalid api/i.test(msg)) {
    return `imgbb API Key 无效或未填写${raw}：请到右上角「图片 API」检查或更换 Key（注意区分 v1 key 与匿名上传）。`;
  }
  // 体积 / 格式
  if (code === 121) return `图片超过 imgbb 32MB 上限${raw}，请压缩后重试。`;
  if (code === 120 || /base64|invalid image format/i.test(msg)) return `图片数据无效（imgbb 报 ${code ?? '格式错误'}）${raw}，请重新选择图片。`;
  if (code === 122 || code === 123 || code === 124) return `图片格式不受支持或文件已损坏${raw}，请换一张图片（建议 PNG/JPG/GIF/WebP）。`;
  if (code === 125) return `图片文件名格式不合法${raw}，请修改文件名后重试。`;
  // 兜底
  const detail = err.message ? `：${err.message}` : '';
  return `imgbb 上传失败${raw}${detail}`;
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
