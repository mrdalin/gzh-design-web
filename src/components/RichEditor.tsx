import React, { useEffect, useRef, useState } from 'react';
import { Button, Space, Toast, Tooltip, Typography } from '@douyinfe/semi-ui';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikeThrough,
  IconH1,
  IconList,
  IconOrderedList,
  IconQuote,
  IconLink,
  IconImage,
  IconDelete,
  IconFile,
} from '@douyinfe/semi-icons';
import { uploadImage } from '../lib/api';
import { countWords } from '../lib/wordCount';
import { htmlToMarkdown } from '../lib/htmlToMarkdown';
import { sanitizeHtmlImages } from '../lib/imageSanitize';

const { Text } = Typography;

interface Props {
  html: string;
  onChange: (html: string) => void;
  imgbbKey: string;
  imgbbExpiry?: number;
  disabled?: boolean;
  onNeedImgbbConfig?: () => void;
  /** 内容变化后自动转 Markdown 回调（传入转换后的 md 文本），用于富文本 ↔ Markdown 双向同步 */
  onAutoConvert?: (markdown: string) => void;
  /** 清除草稿按钮回调 */
  onClear?: () => void;
  /** Word(.docx) 上传回调（由 App 用 mammoth 解析后写入 Markdown） */
  onDocxFile?: (f: File) => void;
  /** 联动滚动：接收本编辑器滚动容器（.rich-editor）的 ref */
  scrollRef?: React.Ref<HTMLDivElement>;
}

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG',
]);

function sanitizeWordHtml(raw: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'text/html');

  function walk(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      // comment / processing instruction etc.
      return null;
    }
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // unwrap: keep children
      const frag = document.createDocumentFragment();
      el.childNodes.forEach((child) => {
        const n = walk(child);
        if (n) frag.appendChild(n);
      });
      return frag;
    }

    const out = document.createElement(tag);
    // keep only href / src / alt / title
    if (tag === 'A' && el.getAttribute('href')) {
      out.setAttribute('href', el.getAttribute('href')!);
      out.setAttribute('target', '_blank');
    }
    if ((tag === 'IMG') && el.getAttribute('src')) {
      out.setAttribute('src', el.getAttribute('src')!);
      if (el.getAttribute('alt')) out.setAttribute('alt', el.getAttribute('alt')!);
    }

    el.childNodes.forEach((child) => {
      const n = walk(child);
      if (n) out.appendChild(n);
    });
    return out;
  }

  const body = doc.body;
  const frag = document.createDocumentFragment();
  Array.from(body.childNodes).forEach((child) => {
    const n = walk(child);
    if (n) frag.appendChild(n);
  });

  const tmp = document.createElement('div');
  tmp.appendChild(frag);
  return tmp.innerHTML;
}

export default function RichEditor({ html, onChange, imgbbKey, imgbbExpiry, disabled, onNeedImgbbConfig, onAutoConvert, onClear, onDocxFile, scrollRef }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const docxRef = useRef<HTMLInputElement>(null);
  const convertTimer = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);

  function onDocxSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onDocxFile?.(f);
    e.target.value = '';
  }

  // 同步外部 html 到编辑器：当 richHtml 被「Markdown → 富文本」方向更新时（用户正在
  // Markdown 区编辑，编辑器未聚焦），将新 HTML 写回可见视图，实现双向实时同步。
  // 用户正在富文本区打字时（聚焦）不打断，避免光标跳动；失焦后由 emit 兜底。
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [html]);

  function emit() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }

  // 富文本 → Markdown：输入防抖转换，避免逐字符触发整篇 htmlToMarkdown
  // 转换前先把 data:image（占位 SVG / 粘贴进来的 base64 图）清洗为占位符，
  // 保证中间 Markdown 编辑器绝不出 base64 长串。
  function richHtmlToMd(html: string) {
    return htmlToMarkdown(sanitizeHtmlImages(html));
  }

  function scheduleConvert() {
    if (!onAutoConvert) return;
    if (convertTimer.current) clearTimeout(convertTimer.current);
    convertTimer.current = window.setTimeout(() => {
      const cur = editorRef.current?.innerHTML || '';
      if (cur.replace(/<[^>]+>/g, '').trim() || cur.includes('<img')) {
        onAutoConvert(richHtmlToMd(cur));
      }
    }, 400);
  }

  function exec(cmd: string, value: string | undefined = undefined) {
    document.execCommand(cmd, false, value);
    emit();
    editorRef.current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const clipboard = e.clipboardData;
    const pastedHtml = clipboard.getData('text/html');
    const pastedText = clipboard.getData('text/plain');

    let clean = '';
    if (pastedHtml) {
      clean = sanitizeWordHtml(pastedHtml);
    } else if (pastedText) {
      // 纯文本按段落转 <p>
      clean = pastedText
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    if (clean) {
      document.execCommand('insertHTML', false, clean);
      emit();
      Toast.success('已粘贴并保留格式');
      // 自动转 Markdown 到中间编辑器
      if (onAutoConvert) {
        // 等 DOM 更新后再读取编辑器内容转换
        requestAnimationFrame(() => {
          const currentHtml = editorRef.current?.innerHTML || '';
          if (currentHtml.replace(/<[^>]+>/g, '').trim()) {
            onAutoConvert(richHtmlToMd(currentHtml));
          }
        });
      }
    }
  }

  async function pickImage() {
    if (!imgbbKey.trim()) {
      onNeedImgbbConfig?.();
      return;
    }
    imgRef.current?.click();
  }
  async function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      const res = await uploadImage(f, imgbbKey, imgbbExpiry);
      document.execCommand('insertImage', false, res.url);
      emit();
      Toast.success('图片已插入');
      // 同步到中间 Markdown 编辑器（与粘贴逻辑一致）
      if (onAutoConvert) {
        requestAnimationFrame(() => {
          const currentHtml = editorRef.current?.innerHTML || '';
          if (currentHtml.replace(/<[^>]+>/g, '').trim() || currentHtml.includes('<img')) {
            const md = richHtmlToMd(currentHtml);
            onAutoConvert(md);
          }
        });
      }
    } catch (err: any) {
      Toast.error(err?.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  }

  function addLink() {
    const url = window.prompt('请输入链接地址', 'https://');
    if (!url) return;
    exec('createLink', url);
  }

  function clearFormat() {
    exec('removeFormat');
    exec('formatBlock', 'P');
  }

  const btnStyle = { padding: '6px 8px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          padding: '0 4px',
        }}
      >
        <Text strong>富文本文案内容书写编辑区</Text>
        <Space spacing={8} style={{ alignItems: 'center' }}>
          {onDocxFile && (
            <Button
              size="small"
              theme="light"
              icon={<IconFile />}
              onClick={() => docxRef.current?.click()}
              disabled={disabled}
            >
              上传 Word
            </Button>
          )}
          {onClear && (
            <Button
              size="small"
              theme="borderless"
              type="danger"
              onClick={onClear}
              disabled={disabled || (!html.replace(/<[^>]+>/g, '').trim() && !html.includes('<img'))}
            >
              清除草稿
            </Button>
          )}
          <Text type="tertiary" size="small">
            支持 Word 带格式粘贴 · 约 {countWords(html)} 字
          </Text>
        </Space>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          border: '1px solid var(--semi-color-border)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          background: 'var(--semi-color-bg-1)',
          flexWrap: 'wrap',
        }}
      >
        <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageSelected} />
        {onDocxFile && <input ref={docxRef} type="file" accept=".docx,.doc" style={{ display: 'none' }} onChange={onDocxSelected} />}

        <Tooltip content="加粗"><Button size="small" theme="borderless" style={btnStyle} icon={<IconBold />} onClick={() => exec('bold')} disabled={disabled} /></Tooltip>
        <Tooltip content="斜体"><Button size="small" theme="borderless" style={btnStyle} icon={<IconItalic />} onClick={() => exec('italic')} disabled={disabled} /></Tooltip>
        <Tooltip content="下划线"><Button size="small" theme="borderless" style={btnStyle} icon={<IconUnderline />} onClick={() => exec('underline')} disabled={disabled} /></Tooltip>
        <Tooltip content="删除线"><Button size="small" theme="borderless" style={btnStyle} icon={<IconStrikeThrough />} onClick={() => exec('strikeThrough')} disabled={disabled} /></Tooltip>

        <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

        <Tooltip content="标题 1"><Button size="small" theme="borderless" style={btnStyle} icon={<IconH1 />} onClick={() => exec('formatBlock', 'H1')} disabled={disabled} /></Tooltip>
        <Tooltip content="标题 2"><Button size="small" theme="borderless" style={btnStyle} onClick={() => exec('formatBlock', 'H2')} disabled={disabled}>H2</Button></Tooltip>
        <Tooltip content="标题 3"><Button size="small" theme="borderless" style={btnStyle} onClick={() => exec('formatBlock', 'H3')} disabled={disabled}>H3</Button></Tooltip>

        <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

        <Tooltip content="无序列表"><Button size="small" theme="borderless" style={btnStyle} icon={<IconList />} onClick={() => exec('insertUnorderedList')} disabled={disabled} /></Tooltip>
        <Tooltip content="有序列表"><Button size="small" theme="borderless" style={btnStyle} icon={<IconOrderedList />} onClick={() => exec('insertOrderedList')} disabled={disabled} /></Tooltip>
        <Tooltip content="引用"><Button size="small" theme="borderless" style={btnStyle} icon={<IconQuote />} onClick={() => exec('formatBlock', 'BLOCKQUOTE')} disabled={disabled} /></Tooltip>
        <Tooltip content="插入链接"><Button size="small" theme="borderless" style={btnStyle} icon={<IconLink />} onClick={addLink} disabled={disabled} /></Tooltip>
        <Tooltip content="上传图片"><Button size="small" theme="borderless" style={btnStyle} icon={<IconImage />} onClick={pickImage} loading={uploading} disabled={disabled} /></Tooltip>

        <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

        <Tooltip content="清除格式"><Button size="small" theme="borderless" style={btnStyle} icon={<IconDelete />} onClick={clearFormat} disabled={disabled} /></Tooltip>
      </div>

      <div
        ref={(el) => {
          editorRef.current = el;
          if (scrollRef) {
            if (typeof scrollRef === 'function') scrollRef(el);
            else (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        contentEditable={!disabled}
        onInput={() => {
          emit();
          scheduleConvert();
        }}
        onBlur={() => {
          emit();
          // 失焦立即同步一次，确保点击「生成排版」前 Markdown 区已是最终内容
          if (onAutoConvert) {
            const cur = editorRef.current?.innerHTML || '';
            if (cur.replace(/<[^>]+>/g, '').trim() || cur.includes('<img')) {
              onAutoConvert(richHtmlToMd(cur));
            }
          }
        }}
        onPaste={handlePaste}
        className="rich-editor"
        data-placeholder="从这里粘贴你的公众号文章内容，支持 Word 带格式粘贴…"
      />
    </div>
  );
}
