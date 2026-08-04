import React, { useState } from 'react';
import { Button, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import type { Theme } from '../types';

const { Text } = Typography;

// 主题预览图映射（按主题 name 匹配）
const THEME_PREVIEW_MAP: Record<string, string> = {
  '橄榄手机': 'https://i.ibb.co/XkYxYmYH/ganlan.jpg',
  '红白': 'https://i.ibb.co/xtVq89Z0/hongbai.jpg',
  '摸鱼绿': 'https://i.ibb.co/r2Z4Qn5Q/moyulv.jpg',
  '摸鱼票据风': 'https://i.ibb.co/m1zD3PL/moyu-ticket.png',
  '石墨极简': 'https://i.ibb.co/sJcFqbSr/shimo.png',
  '留白禅意': 'https://i.ibb.co/3YQvHrBh/whitespace.png',
};

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

  return (
    <div className="theme-bar">
      <div className="theme-bar-scroll">
        <Space spacing={12} align="center">
          {themes.map((t) => (
            <div
              key={t.id}
              className={'theme-bar-card' + (value === t.id && !customActive ? ' active' : '')}
              onClick={() => onSelect(t.id)}
              onMouseEnter={() => setHoveredTheme(t)}
              onMouseLeave={() => setHoveredTheme(null)}
              style={{ position: 'relative' }}
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

              {/* hover 预览浮层 */}
              {hoveredTheme?.id === t.id && THEME_PREVIEW_MAP[t.name] && (
                <div className="theme-preview-popover">
                  <div className="theme-preview-title">{t.name}</div>
                  <div className="theme-preview-desc">{t.scenario}</div>
                  <img
                    src={THEME_PREVIEW_MAP[t.name]}
                    alt={`${t.name} 预览`}
                    className="theme-preview-img"
                  />
                </div>
              )}
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
    </div>
  );
}
