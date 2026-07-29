import React from 'react';
import { Button, Space, Toast, Typography, Banner, Spin } from '@douyinfe/semi-ui';
import { IconCopy, IconRefresh } from '@douyinfe/semi-icons';
import type { ValidationResult } from '../types';
import { copyRichText } from '../lib/clipboard';

const { Text, Title, Paragraph } = Typography;

interface Props {
  html: string;
  title: string;
  loading: boolean;
  validation: ValidationResult | null;
  onCopy: () => void;
  onRegenerate: () => void;
}

export default function PreviewPanel({
  html,
  title,
  loading,
  validation,
  onCopy,
  onRegenerate,
}: Props) {
  async function handleCopy() {
    if (!html) {
      Toast.warning('还没有可复制的内容');
      return;
    }
    try {
      await copyRichText(html);
      Toast.success('已复制，去公众号后台直接 Ctrl+V 粘贴即可');
    } catch {
      Toast.error('复制失败，请尝试手动选中预览内容后复制');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--semi-color-border)',
        }}
      >
        <Title heading={5} style={{ margin: 0 }}>
          预览{title ? `： ${title}` : ''}
        </Title>
        <Space>
          <Button theme="light" icon={<IconRefresh />} onClick={onRegenerate} disabled={loading}>
            重新生成
          </Button>
          <Button theme="solid" icon={<IconCopy />} onClick={handleCopy} disabled={!html}>
            复制排版
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--semi-color-fill-0)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <Spin tip="正在排版，请稍候…" size="large" />
          </div>
        ) : !html ? (
          <div
            style={{
              maxWidth: 680,
              margin: '60px auto',
              textAlign: 'center',
              color: 'var(--semi-color-text-2)',
            }}
          >
            <Paragraph type="secondary">
              左侧粘贴文章、选好主题和模型后，点「生成排版」，
              <br />
              这里会显示符合公众号规范的效果，一键复制即可粘贴到后台。
            </Paragraph>
          </div>
        ) : (
          <div className="preview-frame" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>

      {validation && !loading && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div style={{ borderTop: '1px solid var(--semi-color-border)', padding: 8 }}>
          {validation.errors.length > 0 ? (
            <Banner
              type="danger"
              closeIcon={null}
              description={
                <div>
                  <Text strong>仍有 {validation.errors.length} 处可能不兼容：</Text>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {validation.errors.slice(0, 5).map((e, i) => (
                      <li key={i} style={{ fontSize: 12 }}>{e}</li>
                    ))}
                  </ul>
                </div>
              }
            />
          ) : (
            <Banner
              type="info"
              closeIcon={null}
              description={
                <Text style={{ color: 'var(--semi-color-success)' }}>校验通过，可放心复制粘贴。</Text>
              }
            />
          )}
          {validation.warnings.length > 0 && (
            <Paragraph type="warning" size="small" style={{ marginTop: 4 }}>
              提示：{validation.warnings.slice(0, 3).join('；')}
            </Paragraph>
          )}
        </div>
      )}
    </div>
  );
}
