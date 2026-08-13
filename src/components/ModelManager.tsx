import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Space,
  Toast,
  Typography,
  Divider,
  Tag,
  Popconfirm,
} from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconRefresh, IconTick } from '@douyinfe/semi-icons';
import type { StoredModel } from '../types';
import { loadModels, saveModels, DEFAULT_MODELS } from '../lib/storage';
import { ModelAvatar, isModelConfigured } from '../modelIcons';

const { Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  models: StoredModel[];
  onChange: (models: StoredModel[]) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}

// 预设模型的官方「开通 / 获取 API Key」页面，供未配置 Key 的用户一键直达
const PRESET_API_URLS: Record<string, string> = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  kimi: 'https://platform.moonshot.cn/console/api-keys',
  'agnes-25-flash': 'https://platform.agnes-ai.cn/settings/apiKeys',
  glm: 'https://open.bigmodel.cn/usercenter/apikeys',
  qwen: 'https://dashscope.console.aliyun.com/apiKey',
};

// 自定义模型字段固定顺序：显示名称（可选）→ API 地址 → API KEY → 模型名称
function emptyCustom(): StoredModel {
  return {
    id: 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    displayName: '',
    baseUrl: '',
    apiKey: '',
    model: '',
  };
}

export default function ModelManager({
  visible,
  onClose,
  models,
  onChange,
  selectedId,
  onSelect,
}: Props) {
  const [draft, setDraft] = useState<StoredModel>(emptyCustom());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setDraft(emptyCustom());
  }, [visible]);

  function updateField(field: keyof StoredModel, v: string) {
    setDraft((d) => ({ ...d, [field]: v }));
  }

  function saveDraft(useAfter = false) {
    if (!draft.baseUrl.trim() || !draft.apiKey.trim() || !draft.model.trim()) {
      Toast.warning('请填写完整的 API 地址、API KEY、模型名称');
      return;
    }
    const name = (draft.displayName || '').trim() || draft.model.trim();
    const next = { ...draft, displayName: name };
    let nextModels: StoredModel[];
    if (editingId) {
      nextModels = models.map((m) => (m.id === editingId ? { ...next, id: editingId } : m));
    } else {
      nextModels = [...models, next];
    }
    onChange(nextModels);
    saveModels(nextModels);
    // 若「保存并使用」或当前没有可用的（已配置）模型，则保存后自动设为「使用中」。
    // 用 nextModels 判断（models prop 是旧值，刚保存的模型还没进来）。
    const current = nextModels.find((m) => m.id === selectedId);
    const shouldSelect = useAfter || !current || !isModelConfigured(current);
    if (shouldSelect) {
      onSelect(editingId || next.id);
    }
    setDraft(emptyCustom());
    setEditingId(null);
    Toast.success('已保存模型');
  }

  function editModel(m: StoredModel) {
    setDraft({ ...m });
    setEditingId(m.id);
  }

  function removeModel(m: StoredModel) {
    const next = models.filter((x) => x.id !== m.id);
    onChange(next);
    saveModels(next);
    if (selectedId === m.id) onSelect(next[0]?.id || '');
  }

  function resetPresets() {
    onChange(DEFAULT_MODELS);
    saveModels(DEFAULT_MODELS);
    onSelect(DEFAULT_MODELS[0]?.id || '');
    Toast.success('已恢复默认模型');
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={480}
      title="模型管理"
      footer={
        <Space>
          <Button onClick={onClose}>完成</Button>
        </Space>
      }
    >
      <Paragraph type="secondary" style={{ fontSize: 13 }}>
        所有 API Key 仅保存在你本机浏览器，调用时直连各模型服务商，不会上传到本站服务器。不放心的直接点击右上角X，关闭页面即可。
      </Paragraph>

      <Text strong>已配置模型</Text>
      <div style={{ marginTop: 8 }}>
        {models.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              border: '1px solid var(--semi-color-border)',
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Space>
              <ModelAvatar model={m} size={28} />
              <Tag
                color={selectedId === m.id ? 'blue' : 'grey'}
                onClick={() => onSelect(m.id)}
                style={{ cursor: 'pointer' }}
              >
                {selectedId === m.id ? '使用中' : '选择'}
              </Tag>
              <span>
                <b>{isModelConfigured(m) ? (m.model || m.displayName) : (m.displayName || m.model)}</b>
                {m.preset && <Tag size="small" color="blue" style={{ marginLeft: 6 }}>预设</Tag>}
                {m.preset && !m.apiKey && PRESET_API_URLS[m.id] && (
                  <a
                    href={PRESET_API_URLS[m.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--semi-color-primary)', marginLeft: 8 }}
                  >
                    {m.id === 'agnes-25-flash' ? '免费开通 API' : '开通 API'}
                  </a>
                )}
              </span>
            </Space>
            <Space>
              <Button size="small" theme="borderless" onClick={() => editModel(m)}>
                编辑
              </Button>
              <Popconfirm title="删除该模型？" onConfirm={() => removeModel(m)}>
                <Button size="small" theme="borderless" type="danger" icon={<IconDelete />} />
              </Popconfirm>
            </Space>
          </div>
        ))}
      </div>

      <Divider />
      <Text strong>{editingId ? '编辑模型' : '添加自定义模型'}</Text>

      <Input
        placeholder="显示名称（可选），如「我的 DeepSeek」"
        value={draft.displayName}
        onChange={(v) => updateField('displayName', v)}
        style={{ marginBottom: 10 }}
      />
      <div className={!draft.baseUrl.trim() ? 'input-required' : ''}>
        <Input
          placeholder="API 地址，如 https://api.deepseek.com/v1"
          value={draft.baseUrl}
          onChange={(v) => updateField('baseUrl', v)}
          style={{ marginBottom: 10 }}
        />
      </div>
      <div className={!draft.apiKey.trim() ? 'input-required' : ''}>
        <Input
          placeholder="API KEY"
          type="text"
          autoComplete="off"
          className="key-visually-hidden"
          value={draft.apiKey}
          onChange={(v) => updateField('apiKey', v)}
          style={{ marginBottom: 10 }}
        />
      </div>
      <div className={!draft.model.trim() ? 'input-required' : ''}>
        <Input
          placeholder="模型名称，如 deepseek-chat"
          value={draft.model}
          onChange={(v) => updateField('model', v)}
          style={{ marginBottom: 12 }}
        />
      </div>

      <Space>
        <Button theme="solid" icon={editingId ? undefined : <IconPlus />} onClick={() => saveDraft(false)}>
          {editingId ? '保存修改' : '添加模型'}
        </Button>
        <Button theme="light" icon={<IconTick />} onClick={() => saveDraft(true)}>
          保存并使用
        </Button>
        {editingId && (
          <Button onClick={() => { setDraft(emptyCustom()); setEditingId(null); }}>取消</Button>
        )}
        <Popconfirm
          title="确定要恢复默认模型吗？"
          content="这将清空所有已配置的 API Key 和自定义模型，恢复为初始预设列表。"
          onConfirm={resetPresets}
        >
          <Button theme="light" icon={<IconRefresh />}>
            恢复默认模型
          </Button>
        </Popconfirm>
      </Space>
    </Modal>
  );
}
