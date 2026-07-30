import React, { useRef, useState } from 'react';
import { Button, Space, Toast, Typography, Banner, Spin, Modal } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconRefresh,
  IconDownload,
  IconImage,
  IconGridView,
} from '@douyinfe/semi-icons';
import JSZip from 'jszip';
import type { ValidationResult } from '../types';
import { copyRichText } from '../lib/clipboard';
import { countWords } from '../lib/wordCount';
import { toCanvas, toPng } from '../lib/htmlToImage';

const { Text, Title, Paragraph } = Typography;

interface Props {
  html: string;
  title: string;
  loading: boolean;
  validation: ValidationResult | null;
  onRegenerate: () => void;
}

function sanitizeFileName(s: string): string {
  return (s || '未命名排版').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

export default function PreviewPanel({
  html,
  title,
  loading,
  validation,
  onRegenerate,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [shotVisible, setShotVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);

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

  function exportHtml() {
    if (!html) {
      Toast.warning('还没有可导出的内容');
      return;
    }
    const blob = new Blob(
      ['<!DOCTYPE html><html><head><meta charset="utf-8"><title>', title, '</title></head><body>', html, '</body></html>'],
      { type: 'text/html;charset=utf-8' }
    );
    downloadBlob(blob, `${sanitizeFileName(title)}.html`);
    Toast.success('已导出 HTML 文件');
  }

  async function captureLongImage() {
    if (!frameRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(frameRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      downloadDataUrl(dataUrl, `${sanitizeFileName(title)}_长图.png`);
      Toast.success('长图已生成');
      setShotVisible(false);
    } catch (e: any) {
      Toast.error(e?.message || '生成长图失败');
    } finally {
      setCapturing(false);
    }
  }

  async function captureSegmentedImages() {
    if (!frameRef.current) return;
    setCapturing(true);
    try {
      const canvas = await toCanvas(frameRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const width = canvas.width;
      const segHeight = Math.round(width * 1.33);
      const totalHeight = canvas.height;
      const count = Math.max(1, Math.ceil(totalHeight / segHeight));
      const zip = new JSZip();
      const baseName = sanitizeFileName(title);

      for (let i = 0; i < count; i++) {
        const y = i * segHeight;
        const h = Math.min(segHeight, totalHeight - y);
        const segCanvas = document.createElement('canvas');
        segCanvas.width = width;
        segCanvas.height = segHeight;
        const ctx = segCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, segHeight);
        ctx.drawImage(canvas, 0, y, width, h, 0, 0, width, h);
        const blob = await new Promise<Blob>((resolve) =>
          segCanvas.toBlob((b) => resolve(b!), 'image/png')
        );
        zip.file(`${baseName}_${i + 1}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${baseName}_贴图.zip`);
      Toast.success(`已生成 ${count} 张分段贴图并打包`);
      setShotVisible(false);
    } catch (e: any) {
      Toast.error(e?.message || '生成贴图失败');
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-1)',
        }}
      >
        <Title heading={6} style={{ margin: 0 }}>
          手机预览{title ? ` · ${title}` : ''} · 约 {countWords(html)} 字
        </Title>
        <Space>
          <Button theme="light" icon={<IconRefresh />} onClick={onRegenerate} disabled={loading}>
            重新生成
          </Button>
          <Button theme="solid" icon={<IconCopy />} onClick={handleCopy} disabled={!html}>
            复制排版
          </Button>
          <Button theme="light" icon={<IconDownload />} onClick={exportHtml} disabled={!html}>
            导出 HTML
          </Button>
          <Button theme="light" icon={<IconImage />} onClick={() => setShotVisible(true)} disabled={!html}>
            截图导出
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--semi-color-fill-0)' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 80,
            }}
          >
            <Spin size="large" />
            <Text style={{ marginTop: 12, color: 'var(--semi-color-primary)' }}>
              正在排版，请稍候…
            </Text>
          </div>
        ) : !html ? (
          <div
            style={{
              maxWidth: '100%',
              padding: '40px 16px',
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
          <div ref={frameRef} className="preview-frame" dangerouslySetInnerHTML={{ __html: html }} />
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

      <Modal
        title="选择截图方式"
        visible={shotVisible}
        onCancel={() => setShotVisible(false)}
        footer={null}
        width={420}
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          <button
            disabled={capturing}
            onClick={captureLongImage}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: 16,
              border: '1px solid var(--semi-color-border)',
              borderRadius: 10,
              background: 'var(--semi-color-bg-0)',
              cursor: capturing ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: capturing ? 0.6 : 1,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--semi-color-primary-light-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--semi-color-primary)',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <IconImage />
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>截长图</Text>
              <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 4 }}>
                截取整篇文章为 1 张完整长图
              </Text>
            </div>
          </button>

          <button
            disabled={capturing}
            onClick={captureSegmentedImages}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: 16,
              border: '1px solid var(--semi-color-border)',
              borderRadius: 10,
              background: 'var(--semi-color-bg-0)',
              cursor: capturing ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: capturing ? 0.6 : 1,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--semi-color-success-light-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--semi-color-success)',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <IconGridView />
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>截贴图</Text>
              <div style={{ marginTop: 2 }}>
                <Text type="tertiary" size="small">分段</Text>
              </div>
              <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 4 }}>
                每张尺寸比例 1:1.33，适用于公众号、小红书、抖音等平台的图文
              </Text>
            </div>
          </button>

          {capturing && (
            <div style={{ textAlign: 'center', padding: 8 }}>
              <Spin size="small" />
              <Text type="tertiary" size="small" style={{ marginLeft: 8 }}>正在生成截图…</Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
