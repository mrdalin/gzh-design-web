import React, { useEffect, useState } from 'react';
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
  Tag,
} from '@douyinfe/semi-ui';
import { IconChevronDown, IconTick, IconSetting, IconImage, IconEdit } from '@douyinfe/semi-icons';
import type { StoredModel } from '../types';
import { generateTheme, generateThemeByImage } from '../lib/api';
import { ModelAvatar, modelLabel, isModelConfigured } from '../modelIcons';

const { Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (html: string, name: string) => void;
  models: StoredModel[];
  selectedModelId: string;
  /** 点击下拉中未配置的模型时触发（与顶部一致：打开模型管理弹窗），向导自身不修改全局选中模型 */
  onManageModels?: () => void;
}

const STYLES = ['简约', '国潮', '商务', '清新', '科技', '文艺', '活泼'];

export default function CustomThemeWizard({
  visible,
  onClose,
  onApply,
  models,
  selectedModelId,
  onManageModels,
}: Props) {
  const [style, setStyle] = useState('国潮');
  const [color, setColor] = useState('#C0392B');
  const [scene, setScene] = useState('');
  const [extra, setExtra] = useState('');
  const [modelId, setModelId] = useState(selectedModelId);
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [themeName, setThemeName] = useState('我的主题');
  // 创建方式：text = 文字描述（原始），image = 上传参考图（需视觉模型）
  const [mode, setMode] = useState<'text' | 'image'>('text');
  // 参考图 dataURL（压缩后），用于直连模型
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imgProcessing, setImgProcessing] = useState(false);

  // 每次打开时同步最新选中的模型（组件常驻，visible 由外部控制）
  useEffect(() => {
    if (visible) setModelId(selectedModelId);
  }, [visible, selectedModelId]);

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

  // 参考图上传：读文件 → canvas 压缩（最长边 ~1200px, JPEG 质量).9）→ dataURL
  function handleImageFile(file?: File | null) {
    if (!file) return;
    setImgProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 1200;
          let { width, height } = img;
          if (Math.max(width, height) > MAX) {
            const k = MAX / Math.max(width, height);
            width = Math.round(width * k);
            height = Math.round(height * k);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('无法处理图片');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // 透明/非 JPEG 统一压成 JPEG（白底），视觉模型兼容性最好
          setImageDataUrl(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e: any) {
          Toast.error(e?.message || '图片处理失败');
        } finally {
          setImgProcessing(false);
        }
      };
      img.onerror = () => {
        setImgProcessing(false);
        Toast.error('图片读取失败，请换一张图片');
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => {
      setImgProcessing(false);
      Toast.error('图片读取失败');
    };
    reader.readAsDataURL(file);
  }

  function currentModel() {
    return models.find((x) => x.id === modelId);
  }

  async function handleGenerate() {
    const m = currentModel();
    if (!m || !m.apiKey || !m.baseUrl || !m.model) {
      Toast.warning('请先在「模型管理」里配置好可用的模型与 Key');
      return;
    }
    if (mode === 'image') {
      if (!m.vision) {
        Toast.warning('「参考图生成」需要支持图片的模型，请先在「模型管理」为该模型勾选「支持图片」');
        return;
      }
      if (!imageDataUrl) {
        Toast.warning('请先上传一张参考图');
        return;
      }
    }
    setLoading(true);
    setPreviewHtml('');
    try {
      let html = '';
      if (mode === 'image') {
        const prefs = { desc: '', scene, extra };
        const res = await generateThemeByImage(prefs, imageDataUrl, m);
        html = res.html;
      } else {
        const res = await generateTheme(composePrefs(), m);
        html = res.html;
      }
      setPreviewHtml(html);
      Toast.success(mode === 'image' ? '已按参考图风格生成区块，可整页预览' : '风格区块已生成，可在下方整页预览');
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
        选择下方一种方式生成自定义主题：用文字描述风格，或上传参考图让 AI 提取风格。
        生成后点「应用此主题」，它会出现在左侧主题里，生成排版时会自动套用这套风格。
      </Paragraph>

      <Radio.Group
        type="button"
        className="wizard-mode-switch"
        value={mode}
        onChange={(e: any) => {
          const v = e?.target?.value ?? e;
          setMode(v);
          if (v === 'text') setImageDataUrl('');
        }}
      >
        <Radio value="text" style={{ flex: 1, textAlign: 'center' }}>
          <IconEdit style={{ marginRight: 6, verticalAlign: '-2px' }} />
          文字描述生成主题
        </Radio>
        <Radio value="image" style={{ flex: 1, textAlign: 'center' }}>
          <IconImage style={{ marginRight: 6, verticalAlign: '-2px' }} />
          上传参考图生成主题
        </Radio>
      </Radio.Group>

      {mode === 'text' ? (
        <div>
          <Paragraph type="secondary" size="small" style={{ margin: '0 0 12px' }}>
            描述你想要的视觉风格，AI 会生成一整套区块库（标题、引用、卡片、列表等）供你整页预览确认。
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
          </Space>
        </div>
      ) : (
        <div
          style={{
            marginBottom: 12,
            border: '1px dashed var(--semi-color-border)',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            background: 'var(--semi-color-fill-0)',
          }}
        >
          <Paragraph type="secondary" size="small" style={{ margin: '0 0 12px' }}>
            上传一张参考图，模型会自动分析配色、风格、场景等信息，生成完整主题
          </Paragraph>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            id="theme-ref-image-input"
            onChange={(e) => {
              handleImageFile(e.target.files?.[0] ?? null);
              // 重置 value，允许重复选择同一张图再次触发 onChange
              e.target.value = '';
            }}
          />
          <Button
            icon={<IconImage />}
            theme="light"
            onClick={() => document.getElementById('theme-ref-image-input')?.click()}
            disabled={imgProcessing}
          >
            {imgProcessing ? '正在处理图片…' : imageDataUrl ? '重新选择图片' : '选择参考图'}
          </Button>
          {imageDataUrl && (
            <div style={{ marginTop: 12 }}>
              <img
                src={imageDataUrl}
                alt="参考图预览"
                style={{ maxWidth: 240, maxHeight: 180, borderRadius: 8, border: '1px solid var(--semi-color-border)' }}
              />
            </div>
          )}
          {(() => {
            const m = currentModel();
            return m && !m.vision ? (
              <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 8 }}>
                ⚠️ 当前模型未勾选「支持图片」，生成前请到「模型管理」勾选
              </Text>
            ) : null;
          })()}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Text style={{ flexShrink: 0 }}>主题名称：</Text>
          <Input style={{ flex: 1, minWidth: 0 }} value={themeName} onChange={(v) => setThemeName(v)} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Text style={{ flexShrink: 0 }}>生成模型：</Text>
          <Dropdown
            trigger="click"
            position="bottomLeft"
            className="model-select-dropdown"
            style={{ flex: 1 }}
            content={
              <div className="model-dropdown-menu">
                {models.map((m) => {
                  const active = m.id === modelId;
                  return (
                    <div
                      key={m.id}
                      className={`model-dropdown-item${active ? ' active' : ''}`}
                      onClick={() => {
                        setModelId(m.id);
                        if (!isModelConfigured(m)) {
                          Toast.info('该模型尚未配置 API Key，请先点击 编辑 填写后使用');
                          onManageModels?.();
                        }
                      }}
                    >
                      <ModelAvatar model={m} size={26} />
                      <span className="model-dropdown-name">{modelLabel(m)}</span>
                      {m.vision && <Tag size="small" color="green" style={{ marginLeft: 6 }}>识图</Tag>}
                      {active && (
                        <IconTick
                          style={{ marginLeft: 'auto', color: 'var(--gzh-accent)', flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
                {onManageModels && (
                  <>
                    <Divider style={{ margin: '6px 0' }} />
                    <div className="model-dropdown-item" onClick={() => onManageModels()}>
                      <IconSetting style={{ color: 'var(--gzh-accent)', flexShrink: 0 }} />
                      <span className="model-dropdown-name">管理模型 / 添加自定义</span>
                    </div>
                  </>
                )}
              </div>
            }
          >
            <Button theme="borderless" className="model-select-trigger" style={{ width: '100%' }}>
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
        </div>
      </div>

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
