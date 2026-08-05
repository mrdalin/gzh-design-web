import React from 'react';
import type { StoredModel } from './types';

export type BrandKey =
  | 'agnes'
  | 'deepseek'
  | 'kimi'
  | 'glm'
  | 'minimax'
  | 'qwen'
  | 'fallback';

// 各厂商品牌渐变色（背景）
const BRAND_BG: Record<BrandKey, string> = {
  agnes: 'linear-gradient(135deg,#06A55C,#058A43)',
  deepseek: 'linear-gradient(135deg,#4D6BFE,#3358E0)',
  kimi: 'linear-gradient(135deg,#FF8A3D,#FF5A1F)',
  glm: 'linear-gradient(135deg,#1E9FE0,#0F6FC4)',
  minimax: 'linear-gradient(135deg,#9B5CFF,#6A2FE0)',
  qwen: 'linear-gradient(135deg,#2B7FFF,#1463E0)',
  fallback: 'linear-gradient(135deg,#9AA0A6,#6B7178)',
};

// 依据 id / model / displayName 推断品牌
export function detectBrand(m: StoredModel): BrandKey {
  const s = `${m.id} ${m.model} ${m.displayName}`.toLowerCase();
  if (s.includes('agnes')) return 'agnes';
  if (s.includes('deepseek')) return 'deepseek';
  if (s.includes('kimi') || s.includes('moonshot')) return 'kimi';
  if (s.includes('glm') || s.includes('zhipu') || s.includes('智谱')) return 'glm';
  if (s.includes('minimax')) return 'minimax';
  if (s.includes('qwen') || s.includes('通义') || s.includes('tongyi')) return 'qwen';
  return 'fallback';
}

// 配置判定（baseUrl / apiKey / model 三者齐全才算已配置）
export function isModelConfigured(m?: StoredModel): boolean {
  return !!(m && m.baseUrl && m.apiKey && m.model);
}

// 下拉/列表里展示的文字：已配置→model 名；未配置→displayName +（未配置）
export function modelLabel(m: StoredModel): string {
  const cfg = isModelConfigured(m);
  return cfg ? m.model || m.displayName || '' : `${m.displayName || m.model}（未配置）`;
}

// 头像字母：预设用固定首字母（智谱→Z），其余取 displayName 首字符大写
const BRAND_INITIAL: Record<BrandKey, string> = {
  agnes: 'A',
  deepseek: 'D',
  kimi: 'K',
  glm: 'Z',
  minimax: 'M',
  qwen: 'Q',
  fallback: '',
};

// 头像展示的字母（预设品牌用固定缩写；其余取 displayName 第一个大写字母）
export function avatarLetter(m: StoredModel): string {
  const brand = detectBrand(m);
  if (BRAND_INITIAL[brand]) return BRAND_INITIAL[brand];
  const s = (m.displayName || m.model || 'M').trim();
  return s.charAt(0).toUpperCase();
}

// 模型头像：圆角方形渐变底 + 白色首字母
export function ModelAvatar({
  model,
  size = 24,
}: {
  model: StoredModel;
  size?: number;
}) {
  const brand = detectBrand(model);
  const letter = avatarLetter(model);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: BRAND_BG[brand],
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: Math.round(size * 0.46),
          lineHeight: 1,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          userSelect: 'none',
        }}
      >
        {letter}
      </span>
    </span>
  );
}
