import type { LayoutResult, ModelConfig, Theme } from '../types';

// 同源调用 Cloudflare Pages Functions（/api/*）。
// 本地开发请使用 `npm run pages:dev`（wrangler 同时托管 dist 与 functions），
// 此时 /api/* 也能被解析；纯 `vite dev` 不会提供函数路由。

export async function fetchThemes(): Promise<Theme[]> {
  const res = await fetch('/api/themes');
  if (!res.ok) throw new Error('加载主题列表失败');
  const data: any = await res.json();
  return (data.themes as Theme[]) || [];
}

export async function layout(params: {
  article?: string;
  themeId?: string;
  customLib?: string;
  model: ModelConfig;
}): Promise<LayoutResult> {
  // 注意：Cloudflare Pages Functions 的 request.formData() 在此环境无法正确解析
  // 浏览器提交的 multipart/form-data（article 字段会丢失），因此统一改用 JSON。
  const res = await fetch('/api/layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      article: params.article || '',
      themeId: params.themeId,
      customLib: params.customLib,
      model: params.model,
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '排版失败');
  return data as LayoutResult;
}

export async function uploadImage(
  file: File,
  key: string,
  expiration?: number
): Promise<{ url: string; deleteUrl?: string; thumb?: string }> {
  // 同样规避 multipart 解析问题：图片以 base64 data URL 走 JSON。
  const base64 = await fileToBase64(file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: base64,
      key,
      expiration: expiration && expiration > 0 ? expiration : undefined,
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '图片上传失败');
  return data;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

export async function generateTheme(
  prefs: string,
  model: ModelConfig
): Promise<{ html: string }> {
  const res = await fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences: prefs, model }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '主题生成失败');
  return data;
}

export async function generateArticle(
  prompt: string,
  model: ModelConfig
): Promise<{ article: string }> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '文案生成失败');
  return data;
}
