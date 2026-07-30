import React, { useEffect, useRef } from 'react';
import { Typography } from '@douyinfe/semi-ui';
import EditorToolbar, { initHistory } from './EditorToolbar';

const { Text } = Typography;

interface Props {
  article: string;
  onArticleChange: (v: string) => void;
  onDocxFile: (f: File | null) => void;
  docxName: string;
  imgbbKey: string;
  disabled?: boolean;
}

export default function InputPanel({
  article,
  onArticleChange,
  onDocxFile,
  docxName,
  imgbbKey,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化 undo 历史
  useEffect(() => {
    initHistory(article);
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
        <Text strong>文案内容</Text>
        <Text type="tertiary" size="small">{article.length} 字</Text>
      </div>

      <EditorToolbar
        textareaRef={textareaRef}
        value={article}
        onChange={onArticleChange}
        imgbbKey={imgbbKey}
        disabled={disabled}
        onDocxFile={onDocxFile}
      />

      <textarea
        ref={textareaRef}
        value={article}
        onChange={(e) => onArticleChange(e.target.value)}
        disabled={disabled}
        placeholder="在此粘贴 Markdown 或纯文本文章；也可上传 .docx 由系统提取正文。标题用 #，加粗用 **，列表用 -。"
        className="editor-textarea"
      />

      {docxName && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          已上传 Word：{docxName}
        </div>
      )}
    </div>
  );
}
