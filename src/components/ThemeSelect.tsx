import React from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';
import { IconBulb } from '@douyinfe/semi-icons';
import type { Theme } from '../types';

interface Props {
  themes: Theme[];
  value: string; // 主题 id 或 'custom'
  customActive: boolean;
  customName: string;
  onSelect: (id: string) => void;
  onOpenWizard: () => void;
}

const { Text } = Typography;

export default function ThemeSelect({
  themes,
  value,
  customActive,
  customName,
  onSelect,
  onOpenWizard,
}: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text strong>选择主题</Text>
        <Button
          size="small"
          theme="light"
          icon={<IconBulb />}
          onClick={onOpenWizard}
        >
          自定义主题
        </Button>
      </div>

      <div className="theme-grid">
        {themes.map((t) => (
          <div
            key={t.id}
            className={'theme-card' + (value === t.id && !customActive ? ' active' : '')}
            onClick={() => onSelect(t.id)}
          >
            <span className="theme-dot" style={{ background: t.mainColor }} />
            <span className="theme-name">{t.name}</span>
            <div className="theme-scenario">{t.scenario}</div>
          </div>
        ))}

        <div
          className={'theme-card' + (customActive ? ' active' : '')}
          onClick={() => onSelect('custom')}
          style={{ borderStyle: 'dashed' }}
        >
          <span className="theme-dot" style={{ background: 'linear-gradient(135deg,#7c5cff,#00c2c7)' }} />
          <span className="theme-name">{customName || '自定义主题'}</span>
          <div className="theme-scenario">你在向导里生成的风格</div>
        </div>
      </div>
    </div>
  );
}
