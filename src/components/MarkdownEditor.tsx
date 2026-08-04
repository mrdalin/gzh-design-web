import React, { useEffect, useRef } from 'react';
import { Typography } from '@douyinfe/semi-ui';
import EditorToolbar, { initHistory } from './EditorToolbar';
import { countWords } from '../lib/wordCount';

const { Text } = Typography;

interface Props {
  value: string;
  onChange: (v: string) => void;
  imgbbKey: string;
  imgbbExpiry?: number;
  disabled?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onNeedImgbbConfig?: () => void;
  /** Word(.docx) 上传回调（由 App 用 mammoth 解析后写入 Markdown） */
  onDocxFile?: (f: File) => void;
}

export default function MarkdownEditor({ value, onChange, imgbbKey, imgbbExpiry, disabled, textareaRef: externalRef, onNeedImgbbConfig, onDocxFile }: Props) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;

  useEffect(() => {
    initHistory(value);
  }, []);

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
        <Text strong>Markdown 编辑器</Text>
        <Text type="tertiary" size="small">可二次编辑 · 约 {countWords(value)} 字</Text>
      </div>

      <EditorToolbar
        textareaRef={textareaRef}
        value={value}
        onChange={onChange}
        imgbbKey={imgbbKey}
        imgbbExpiry={imgbbExpiry}
        disabled={disabled}
        onDocxFile={onDocxFile}
        onNeedImgbbConfig={onNeedImgbbConfig}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="在这里输入或粘贴 Markdown 文章…"
        className="editor-textarea"
      />
    </div>
  );
}
