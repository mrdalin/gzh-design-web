import React, { useRef, useState } from 'react';
import { Button, Space, Toast, Tooltip } from '@douyinfe/semi-ui';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikeThrough,
  IconH1,
  IconList,
  IconOrderedList,
  IconQuote,
  IconCode,
  IconLink,
  IconImage,
  IconFile,
  IconUndo,
  IconRedo,
} from '@douyinfe/semi-icons';
import { uploadImage } from '../lib/api';

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  imgbbKey: string;
  imgbbExpiry?: number;
  disabled?: boolean;
  onDocxFile?: (f: File | null) => void;
  onNeedImgbbConfig?: () => void;
}

// 维护一个简陋的 undo/redo 栈
const history: string[] = [];
let historyIndex = -1;
const MAX_HISTORY = 30;

function pushHistory(text: string) {
  // 避免连续相同状态
  if (history[historyIndex] === text) return;
  history.splice(historyIndex + 1, history.length - historyIndex - 1, text);
  if (history.length > MAX_HISTORY) history.shift();
  else historyIndex++;
}

export function initHistory(text: string) {
  history.length = 0;
  history.push(text);
  historyIndex = 0;
}

export default function EditorToolbar({
  textareaRef,
  value,
  onChange,
  imgbbKey,
  imgbbExpiry,
  disabled,
  onDocxFile,
  onNeedImgbbConfig,
}: Props) {
  const docxRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function insertAround(before: string, after: string, placeholder = '文本') {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;
    const replacement = before + selected + after;
    const next = value.slice(0, start) + replacement + value.slice(end);
    onChange(next);
    // 焦点回到选区
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + before.length;
      el.setSelectionRange(caret, caret + selected.length);
    });
    pushHistory(next);
  }

  function insertLine(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const before = value.slice(0, start);
    const after = value.slice(start);
    const needNewline = before.length > 0 && !before.endsWith('\n');
    const next = before + (needNewline ? '\n' : '') + prefix + after.replace(/^\n?/, '');
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + (needNewline ? 1 : 0) + prefix.length;
      el.setSelectionRange(pos, pos);
    });
    pushHistory(next);
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    onChange(history[historyIndex]);
  }
  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    onChange(history[historyIndex]);
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
      const snip = `\n![${f.name.replace(/\.[^.]+$/, '')}](${res.url})\n`;
      insertAround('', snip, '');
      Toast.success('图片已插入');
    } catch (err: any) {
      Toast.error(err?.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  }

  function pickDocx() {
    if (!onDocxFile) return;
    docxRef.current?.click();
  }
  function onDocxSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onDocxFile?.(f);
    e.target.value = '';
  }

  function addLink() {
    const url = window.prompt('请输入链接地址', 'https://');
    if (!url) return;
    insertAround('[', `](${url})`, '链接文字');
  }

  const btnStyle = { padding: '6px 8px' };

  return (
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
        {onDocxFile && <input ref={docxRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={onDocxSelected} />}
        <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageSelected} />

      <Tooltip content="加粗"><Button size="small" theme="borderless" style={btnStyle} icon={<IconBold />} onClick={() => insertAround('**', '**')} disabled={disabled} /></Tooltip>
      <Tooltip content="斜体"><Button size="small" theme="borderless" style={btnStyle} icon={<IconItalic />} onClick={() => insertAround('*', '*')} disabled={disabled} /></Tooltip>
      <Tooltip content="下划线"><Button size="small" theme="borderless" style={btnStyle} icon={<IconUnderline />} onClick={() => insertAround('<u>', '</u>')} disabled={disabled} /></Tooltip>
      <Tooltip content="删除线"><Button size="small" theme="borderless" style={btnStyle} icon={<IconStrikeThrough />} onClick={() => insertAround('~~', '~~')} disabled={disabled} /></Tooltip>

      <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

      <Tooltip content="标题 1"><Button size="small" theme="borderless" style={btnStyle} icon={<IconH1 />} onClick={() => insertLine('# ')} disabled={disabled} /></Tooltip>
      <Tooltip content="标题 2"><Button size="small" theme="borderless" style={btnStyle} onClick={() => insertLine('## ')} disabled={disabled}>H2</Button></Tooltip>
      <Tooltip content="标题 3"><Button size="small" theme="borderless" style={btnStyle} onClick={() => insertLine('### ')} disabled={disabled}>H3</Button></Tooltip>

      <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

      <Tooltip content="无序列表"><Button size="small" theme="borderless" style={btnStyle} icon={<IconList />} onClick={() => insertLine('- ')} disabled={disabled} /></Tooltip>
      <Tooltip content="有序列表"><Button size="small" theme="borderless" style={btnStyle} icon={<IconOrderedList />} onClick={() => insertLine('1. ')} disabled={disabled} /></Tooltip>
      <Tooltip content="引用"><Button size="small" theme="borderless" style={btnStyle} icon={<IconQuote />} onClick={() => insertLine('> ')} disabled={disabled} /></Tooltip>
      <Tooltip content="行内代码"><Button size="small" theme="borderless" style={btnStyle} icon={<IconCode />} onClick={() => insertAround('`', '`')} disabled={disabled} /></Tooltip>
      <Tooltip content="插入链接"><Button size="small" theme="borderless" style={btnStyle} icon={<IconLink />} onClick={addLink} disabled={disabled} /></Tooltip>

      <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

      <Tooltip content="上传图片"><Button size="small" theme="borderless" style={btnStyle} icon={<IconImage />} onClick={pickImage} loading={uploading} disabled={disabled} /></Tooltip>
      {onDocxFile && (
        <Tooltip content="上传 Word"><Button size="small" theme="borderless" style={btnStyle} icon={<IconFile />} onClick={pickDocx} disabled={disabled} /></Tooltip>
      )}

      <div style={{ width: 1, height: 18, background: 'var(--semi-color-border)', margin: '0 4px' }} />

      <Tooltip content="撤销"><Button size="small" theme="borderless" style={btnStyle} icon={<IconUndo />} onClick={undo} disabled={disabled || historyIndex <= 0} /></Tooltip>
      <Tooltip content="重做"><Button size="small" theme="borderless" style={btnStyle} icon={<IconRedo />} onClick={redo} disabled={disabled || historyIndex >= history.length - 1} /></Tooltip>
    </div>
  );
}
