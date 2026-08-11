import React, { useEffect, useRef, useState } from 'react';
import { Button, Toast, Typography, Spin, Modal } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconDownload,
  IconImage,
  IconGridView,
  IconSend,
} from '@douyinfe/semi-icons';
import JSZip from 'jszip';
import { applyDark, applyLight } from '../lib/darkmode';
import type { ValidationResult } from '../types';
import { copyRichText } from '../lib/clipboard';
import { countWords } from '../lib/wordCount';
import { toCanvas, toPng } from '../lib/htmlToImage';

const { Text, Title, Paragraph } = Typography;

interface StreamState {
  phase: string;
  partial: string;
  chars: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface Props {
  html: string;
  title: string;
  themeName?: string;
  loading: boolean;
  validation: ValidationResult | null;
  onRegenerate: () => void;
  // 流式生成状态（边生成边显示）
  stream?: StreamState | null;
  // 生成完成后的 token 用量（留存展示，gen 清空后仍保留）
  usage?: { inputTokens?: number; outputTokens?: number } | null;
  // 重新生成按钮：排版完成后 1s 才可点击
  readyForRegenerate?: boolean;
  // 联动滚动：接收预览区滚动容器的 ref
  scrollRef?: React.Ref<HTMLDivElement>;
}

function safeText(s: string | undefined): string {
  return (s || '').replace(/[\\/:*?"<>|]/g, '_').trim();
}

// 导出文件名：固定前缀「排版」+ 标题前 3 字 + 主题名(截断6字) + 精确到秒的时间戳，短且不重样
function makeExportBase(title: string, themeName?: string): string {
  const head = safeText(title).slice(0, 3) || '未命名';
  const theme = safeText(themeName).slice(0, 6) || '默认';
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  return `排版_${head}_${theme}_${ts}`;
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

function StreamStatusBar({ stream }: { stream: StreamState }) {
  return (
    <div
      className="preview-stream-status"
      style={{
        flexShrink: 0,
        padding: '10px 12px',
        borderTop: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-1)',
      }}
    >
      <div className="stream-status">
        <span className="stream-dot" />
        <Text strong style={{ color: 'var(--semi-color-primary)' }}>
          {stream.phase}
        </Text>
      </div>
      <div className="stream-progress" style={{ margin: '8px 0' }}>
        <div className="stream-bar" />
      </div>
      <div className="stream-meta" style={{ marginBottom: 0 }}>
        {stream.outputTokens != null ? (
          <>已输出 token <b>{stream.outputTokens}</b></>
        ) : (
          <>已生成 <b>{stream.chars}</b> 字</>
        )}
        {stream.inputTokens != null && <> · 输入 <b>{stream.inputTokens}</b> tokens</>}
      </div>
    </div>
  );
}

export default function PreviewPanel({
  html,
  title,
  themeName,
  loading,
  validation,
  onRegenerate,
  stream,
  usage,
  readyForRegenerate = false,
  scrollRef,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const [shotVisible, setShotVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewDark, setPreviewDark] = useState(false);

  const shownHtml = loading && stream ? stream.partial : html;

  // 流式生成时自动滚到底部，营造「最新内容在下方不停输出」的对话式效果。
  useEffect(() => {
    if (loading && stream && internalScrollRef.current) {
      const el = internalScrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [loading, stream, stream?.partial]);

  // 生成新排版(html 变化)时回到亮色:新内容需重新转换,避免残留旧暗色样式
  useEffect(() => {
    if (previewDark && frameRef.current) {
      applyLight(frameRef.current);
      setPreviewDark(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  // 复制/导出/截图前自动恢复亮色:公众号后台为亮色,暗色样式不应进入产出物
  function ensureLight() {
    if (previewDark && frameRef.current) {
      applyLight(frameRef.current);
      setPreviewDark(false);
    }
  }

  function toggleDark() {
    if (!frameRef.current) return;
    if (previewDark) {
      applyLight(frameRef.current);
      setPreviewDark(false);
    } else {
      applyDark(frameRef.current);
      setPreviewDark(true);
    }
  }

  async function handleCopy() {
    ensureLight();
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
    ensureLight();
    if (!html) {
      Toast.warning('还没有可导出的内容');
      return;
    }
    const blob = new Blob(
      ['<!DOCTYPE html><html><head><meta charset="utf-8"><title>', title, '</title></head><body>', html, '</body></html>'],
      { type: 'text/html;charset=utf-8' }
    );
    downloadBlob(blob, `${makeExportBase(title, themeName)}.html`);
    Toast.success('已导出 HTML 文件');
  }

  async function captureLongImage() {
    if (!frameRef.current) return;
    ensureLight();
    setCapturing(true);
    try {
      const dataUrl = await toPng(frameRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      downloadDataUrl(dataUrl, `${makeExportBase(title, themeName)}_长图.png`);
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
    ensureLight();
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
      const baseName = makeExportBase(title, themeName);

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

  // 校验状态文案：仅用于底部小字提示
  let validationText: string | null = null;
  if (validation && !loading && html) {
    if (validation.errors.length > 0) {
      validationText = `⚠️ ${validation.errors.length} 处不兼容`;
    } else {
      validationText = '✅ 校验通过';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          rowGap: 6,
          padding: '10px 12px',
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-1)',
          flexShrink: 0,
        }}
      >
        <Title heading={6} style={{ margin: 0, flexShrink: 0 }}>
          手机预览 · 约 {countWords(shownHtml)} 字
        </Title>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            rowGap: 6,
            columnGap: 4,
            flexShrink: 0,
          }}
        >
          <Button theme="borderless" onClick={toggleDark} disabled={!!loading || !html}>
            {previewDark ? '☀️ 亮色' : '🌙 深色'}
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
        </div>
      </div>

      <div
        ref={(el) => {
          internalScrollRef.current = el;
          if (scrollRef) {
            if (typeof scrollRef === 'function') scrollRef(el);
            else (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        className="preview-stage"
      >
        <div className="phone-bezel">
          <div className="phone-screen">
            <div style={{ background: '#fff' }}>
        {loading && stream ? (
          <div
            className="preview-frame stream-live"
            dangerouslySetInnerHTML={{ __html: stream.partial }}
          />
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
          </div>
        </div>
      </div>

      {/* 生成中状态条：固定显示在滚动区下方、底部栏上方，生成完成后自动消失 */}
      {loading && stream && <StreamStatusBar stream={stream} />}

      {/* 底部栏：左侧校验小字 + 本次 token 用量 + 右侧重新生成按钮 */}
      <div className="preview-footer" style={{ justifyContent: 'space-between' }}>
        {validationText || (usage && !loading) ? (
          <Text type="tertiary" size="small" style={{ opacity: 0.7, userSelect: 'none', whiteSpace: 'nowrap' }}>
            {validationText}
            {usage && !loading && usage.outputTokens != null && (
              <>
                {validationText ? ' · ' : ''}本次消耗 输入 <b>{usage.inputTokens}</b> / 输出 <b>{usage.outputTokens}</b> tokens
              </>
            )}
          </Text>
        ) : <span />}
        <Button
          theme="solid"
          icon={<IconSend />}
          onClick={onRegenerate}
          disabled={loading || !html || !readyForRegenerate}
        >
          重新生成
        </Button>
      </div>

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
