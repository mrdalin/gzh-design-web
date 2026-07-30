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
  file?: File;
  themeId?: string;
  customLib?: string;
  model: ModelConfig;
}): Promise<LayoutResult> {
  const fd = new FormData();
  if (params.file) {
    fd.append('file', params.file);
  } else {
    fd.append('article', params.article || '');
  }
  if (params.themeId) fd.append('themeId', params.themeId);
  if (params.customLib) fd.append('customLib', params.customLib);
  fd.append('model', JSON.stringify(params.model));

  const res = await fetch('/api/layout', { method: 'POST', body: fd });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '排版失败');
  return data as LayoutResult;
}

export async function uploadImage(
  file: File,
  key: string
): Promise<{ url: string; deleteUrl?: string; thumb?: string }> {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('key', key);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || '图片上传失败');
  return data;
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
