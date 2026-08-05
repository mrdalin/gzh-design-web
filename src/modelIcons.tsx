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

// 白色品牌标记（透明背景，配合渐变容器使用）
function BrandMark({ brand, displayName }: { brand: BrandKey; displayName: string }) {
  const common = { width: '100%', height: '100%', viewBox: '0 0 24 24' } as const;

  switch (brand) {
    case 'agnes':
      return (
        <svg {...common}>
          <path
            d="M12 4.5l6.4 13.2h-3.1l-1.2-2.8h-4.2l-1.2 2.8H5.6L12 4.5z m-1.2 7.6h2.4L12 9.3l-1.2 3z"
            fill="#fff"
          />
        </svg>
      );
    case 'deepseek':
      return (
        <svg {...common}>
          <path d="M7 4.5h4.6a6.5 6.5 0 010 13H7V4.5z" fill="#fff" />
          <path
            d="M7 17.5h4.6a3.2 3.2 0 000-6.4H7"
            stroke="#3358E0"
            strokeWidth="2.2"
            fill="none"
          />
        </svg>
      );
    case 'kimi':
      return (
        <svg {...common}>
          <path
            d="M5 6.5h14a2 2 0 012 2v6.5a2 2 0 01-2 2H11l-4 3.2v-3.2H5a2 2 0 01-2-2V8.5a2 2 0 012-2z"
            fill="#fff"
          />
        </svg>
      );
    case 'glm':
      return (
        <svg {...common}>
          <g fill="#fff">
            <rect x="6" y="6" width="5" height="5" rx="1" />
            <rect x="13" y="6" width="5" height="5" rx="1" />
            <rect x="6" y="13" width="5" height="5" rx="1" />
            <rect x="13" y="13" width="5" height="5" rx="1" />
          </g>
        </svg>
      );
    case 'minimax':
      return (
        <svg {...common}>
          <path
            d="M5 18L9 6l3 7 3-7 4 12"
            stroke="#fff"
            strokeWidth="2.4"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'qwen':
      return (
        <svg {...common}>
          <circle cx="11.3" cy="12" r="6.2" stroke="#fff" strokeWidth="2.2" fill="none" />
          <path d="M15.6 16.3L19 19.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <text
            x="12"
            y="16.5"
            fontSize="13"
            fontWeight="700"
            textAnchor="middle"
            fill="#fff"
            fontFamily="system-ui, sans-serif"
          >
            {(displayName || 'M').trim().charAt(0).toUpperCase()}
          </text>
        </svg>
      );
  }
}

// 模型头像：圆角方形渐变底 + 白色品牌标记
export function ModelAvatar({
  model,
  size = 24,
}: {
  model: StoredModel;
  size?: number;
}) {
  const brand = detectBrand(model);
  const mark = Math.round(size * 0.62);
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
      <span style={{ width: mark, height: mark, display: 'inline-flex' }}>
        <BrandMark brand={brand} displayName={model.displayName} />
      </span>
    </span>
  );
}
