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
} from '@douyinfe/semi-icons';
import { uploadImage } from '../lib/api';

const { Text } = Typography;

interface Props {
  html: string;
  onChange: (html: string) => void;
  imgbbKey: string;
  disabled?: boolean;
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

export default function RichEditor({ html, onChange, imgbbKey, disabled }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 同步外部 html 到编辑器（仅在首次或显式重置时）
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, []);

  function emit() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
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
    }
  }

  async function pickImage() {
    if (!imgbbKey.trim()) {
      Toast.warning('请先在右上角「设置」里填写 imgbb API Key');
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
      const res = await uploadImage(f, imgbbKey);
      document.execCommand('insertImage', false, res.url);
      emit();
      Toast.success('图片已插入');
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          padding: '0 4px',
        }}
      >
        <Text strong>文案内容</Text>
        <Text type="tertiary" size="small">支持从 Word 直接带格式粘贴</Text>
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
        ref={editorRef}
        contentEditable={!disabled}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        className="rich-editor"
        data-placeholder="从这里粘贴你的公众号文章内容，支持 Word 带格式粘贴…"
      />
    </div>
  );
}
