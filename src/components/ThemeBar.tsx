import React from 'react';
import { Button, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { IconPlus, IconHistory } from '@douyinfe/semi-icons';
import type { Theme } from '../types';

const { Text } = Typography;

interface Props {
  themes: Theme[];
  value: string;
  customActive: boolean;
  customName: string;
  onSelect: (id: string) => void;
  onOpenWizard: () => void;
  onOpenHistory: () => void;
}

export default function ThemeBar({
  themes,
  value,
  customActive,
  customName,
  onSelect,
  onOpenWizard,
  onOpenHistory,
}: Props) {
  return (
    <div className="theme-bar">
      <div className="theme-bar-scroll">
        <Space spacing={12} align="center">
          {themes.map((t) => (
            <div
              key={t.id}
              className={'theme-bar-card' + (value === t.id && !customActive ? ' active' : '')}
              onClick={() => onSelect(t.id)}
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
          <Button icon={<IconHistory />} onClick={onOpenHistory}>
            排版历史
          </Button>
        </Space>
      </div>
    </div>
  );
}
