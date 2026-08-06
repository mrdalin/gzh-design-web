import React, { useState } from 'react';
import { Button, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import type { Theme } from '../types';

const { Text } = Typography;

// 主题预览图映射（按主题 id 匹配，id 由组件库文件名抽取，稳定不易错）
const THEME_PREVIEW_MAP: Record<string, string> = {
  'moyu-green': 'https://i.ibb.co/8DNzd4vp/moyulv.jpg',
  'red-white': 'https://i.ibb.co/Y702fTDf/hongbai.jpg',
  'graphite-minimal': 'https://i.ibb.co/YFfNJb8y/shimo.png',
  'zen-whitespace': 'https://i.ibb.co/1JQywXZr/whitespace.png',
  'moyu-ticket': 'https://i.ibb.co/KpShMQxj/moyu-ticket.png',
  'olive-journal': 'https://i.ibb.co/kgkGnR5v/ganlan.jpg',
};

// 竖长图主题（原始比例为竖向，弹窗需按完整比例显示，不能裁切）
const TALL_THEMES = new Set(['moyu-ticket', 'graphite-minimal', 'zen-whitespace']);

interface Props {
  themes: Theme[];
  value: string;
  customActive: boolean;
  customName: string;
  onSelect: (id: string) => void;
  onOpenWizard: () => void;
}

export default function ThemeBar({
  themes,
  value,
  customActive,
  customName,
  onSelect,
  onOpenWizard,
}: Props) {
  const [hoveredTheme, setHoveredTheme] = useState<Theme | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  function handleCardEnter(t: Theme, e: React.MouseEvent) {
    setHoveredTheme(t);
    setHoverRect(e.currentTarget.getBoundingClientRect());
  }

  return (
    <div className="theme-bar">
      <div className="theme-bar-hint" title="鼠标悬停主题卡片上可预览排版效果">
        选择
        <br />
        主题
      </div>
      <div className="theme-bar-scroll">
        <Space spacing={12} align="center">
          {themes.map((t) => (
            <div
              key={t.id}
              className={'theme-bar-card' + (value === t.id && !customActive ? ' active' : '')}
              onClick={() => onSelect(t.id)}
              onMouseEnter={(e) => handleCardEnter(t, e)}
              onMouseLeave={() => { setHoveredTheme(null); setHoverRect(null); }}
            >
              <div className="theme-bar-dot" style={{ background: t.mainColor }} />
              <div className="theme-bar-info">
                <div className="theme-bar-name">
                  {t.name}
                  {value === t.id && !customActive && (
                    <Tag size="small" color="green" style={{ marginLeft: 6 }}>当前</Tag>
                  )}
                </div>
                <div className="theme-bar-scenario">{t.scenario}</div>
              </div>
            </div>
          ))}

          <div
            className={'theme-bar-card' + (customActive ? ' active' : '')}
            onClick={() => onSelect('custom')}
            style={{ borderStyle: 'dashed' }}
          >
            <div
              className="theme-bar-dot"
              style={{ background: 'linear-gradient(135deg,#7c5cff,#00c2c7)' }}
            />
            <div className="theme-bar-info">
              <div className="theme-bar-name">{customName || '自定义主题'}</div>
              <div className="theme-bar-scenario">你在向导里生成的风格</div>
            </div>
          </div>

          <Button icon={<IconPlus />} onClick={onOpenWizard}>
            自定义主题
          </Button>
        </Space>
      </div>

      {/* 预览浮层：渲染在 .theme-bar 层级，用 fixed 定位脱离滚动容器裁剪 */}
      {hoveredTheme && THEME_PREVIEW_MAP[hoveredTheme.id] && hoverRect && (() => {
        const isTall = TALL_THEMES.has(hoveredTheme.id);
        const popWidth = isTall ? 210 : 300;
        return (
          <div
            className="theme-preview-popover"
            style={{
              position: 'fixed',
              top: hoverRect.bottom + 8,
              left: hoverRect.left + hoverRect.width / 2 - popWidth / 2,
              width: popWidth,
              zIndex: 9999,
            }}
          >
            <div className="theme-preview-title">{hoveredTheme.name}</div>
            <div className="theme-preview-desc">{hoveredTheme.scenario}</div>
            <img
              src={THEME_PREVIEW_MAP[hoveredTheme.id]}
              alt={`${hoveredTheme.name} 预览`}
              className={'theme-preview-img' + (isTall ? ' tall' : ' square')}
            />
          </div>
        );
      })()}
    </div>
  );
}
