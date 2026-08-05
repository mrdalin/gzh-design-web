import React, { useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Toast,
  Typography,
  Input,
  Dropdown,
  Divider,
  Spin,
  Radio,
} from '@douyinfe/semi-ui';
import { IconChevronDown, IconTick, IconSetting } from '@douyinfe/semi-icons';
import type { StoredModel } from '../types';
import { generateTheme } from '../lib/api';
import { ModelAvatar, modelLabel } from '../modelIcons';

const { Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (html: string, name: string) => void;
  models: StoredModel[];
  selectedModelId: string;
}

const STYLES = ['简约', '国潮', '商务', '清新', '科技', '文艺', '活泼'];

export default function CustomThemeWizard({
  visible,
  onClose,
  onApply,
  models,
  selectedModelId,
}: Props) {
  const [style, setStyle] = useState('国潮');
  const [color, setColor] = useState('#C0392B');
  const [scene, setScene] = useState('');
  const [extra, setExtra] = useState('');
  const [modelId, setModelId] = useState(selectedModelId);
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [themeName, setThemeName] = useState('我的主题');

  function composePrefs(): string {
    return [
      `风格：${style}`,
      `主色：${color}`,
      scene ? `适用场景：${scene}` : '',
      extra ? `其他要求：${extra}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  async function handleGenerate() {
    const m = models.find((x) => x.id === modelId);
    if (!m || !m.apiKey || !m.baseUrl || !m.model) {
      Toast.warning('请先在「模型管理」里配置好可用的模型与 Key');
      return;
    }
    setLoading(true);
    setPreviewHtml('');
    try {
      const res = await generateTheme(composePrefs(), m);
      setPreviewHtml(res.html);
      Toast.success('风格区块已生成，可在下方整页预览');
    } catch (e: any) {
      Toast.error(e?.message || '主题生成失败');
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!previewHtml) {
      Toast.warning('请先生成主题预览');
      return;
    }
    onApply(previewHtml, themeName.trim() || '自定义主题');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={720}
      title="自定义主题"
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button theme="solid" onClick={handleApply} disabled={!previewHtml}>
            应用此主题
          </Button>
        </Space>
      }
    >
      <Paragraph type="secondary" size="small">
        描述你想要的视觉风格，AI 会生成一整套区块库（标题、引用、卡片、列表等）供你整页预览确认。
        点「应用此主题」后，它会出现在左侧主题里，生成排版时会自动套用这套风格。
      </Paragraph>

      <Space wrap style={{ marginBottom: 12 }}>
        <Text>风格：</Text>
        <Radio.Group type="button" value={style} onChange={(e: any) => setStyle(e?.target?.value ?? e)}>
          {STYLES.map((s) => (
            <Radio key={s} value={s}>
              {s}
            </Radio>
          ))}
        </Radio.Group>
      </Space>

      <Space wrap align="center" style={{ marginBottom: 12 }}>
        <Text>主色：</Text>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
        />
        <Input
          style={{ width: 120 }}
          value={color}
          onChange={(v) => setColor(v)}
        />
        <Text>主题名称：</Text>
        <Input style={{ width: 160 }} value={themeName} onChange={(v) => setThemeName(v)} />
      </Space>

      <Space wrap align="center" style={{ marginBottom: 12 }}>
        <Text>生成模型：</Text>
        <Dropdown
          trigger="click"
          position="bottomLeft"
          className="model-select-dropdown"
          content={
            <div className="model-dropdown-menu">
              {models.map((m) => {
                const active = m.id === modelId;
                return (
                  <div
                    key={m.id}
                    className={`model-dropdown-item${active ? ' active' : ''}`}
                    onClick={() => setModelId(m.id)}
                  >
                    <ModelAvatar model={m} size={26} />
                    <span className="model-dropdown-name">{modelLabel(m)}</span>
                    {active && (
                      <IconTick
                        style={{ marginLeft: 'auto', color: 'var(--gzh-accent)', flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          }
        >
          <Button theme="borderless" className="model-select-trigger">
            {(() => {
              const sel = models.find((m) => m.id === modelId);
              return sel ? <ModelAvatar model={sel} size={22} /> : <IconSetting />;
            })()}
            <span className="model-select-label">
              {(() => {
                const sel = models.find((m) => m.id === modelId);
                return sel ? modelLabel(sel) : '选择模型';
              })()}
            </span>
            <IconChevronDown />
          </Button>
        </Dropdown>
      </Space>

      <Input
        placeholder="适用场景，如「数码产品评测」「个人成长随笔」"
        value={scene}
        onChange={(v) => setScene(v)}
        style={{ marginBottom: 12 }}
      />
      <Input
        placeholder="其他要求（可选）：独特细节、字体观感、留白偏好等"
        value={extra}
        onChange={(v) => setExtra(v)}
        style={{ marginBottom: 12 }}
      />

      <Button theme="solid" onClick={handleGenerate} loading={loading}>
        生成主题预览
      </Button>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin tip="正在生成风格区块库…" />
        </div>
      )}

      {!loading && previewHtml && (
        <div
          style={{
            marginTop: 16,
            border: '1px solid var(--semi-color-border)',
            borderRadius: 8,
            maxHeight: 360,
            overflow: 'auto',
            padding: 12,
            background: '#fff',
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </Modal>
  );
}
