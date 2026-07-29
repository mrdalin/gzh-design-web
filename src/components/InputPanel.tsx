import React, { useRef, useState } from 'react';
import { Button, TextArea, Typography, Toast, Space, Tag } from '@douyinfe/semi-ui';
import { IconUpload, IconImage, IconFile } from '@douyinfe/semi-icons';
import { uploadImage } from '../lib/api';

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
  const docxRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function pickDocx() {
    docxRef.current?.click();
  }
  function onDocxSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onDocxFile(f);
    e.target.value = '';
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
      const snip = `\n![${f.name.replace(/\.[^.]+$/, '')}](${res.url})\n`;
      onArticleChange(article + snip);
      Toast.success('图片已上传并插入到文章末尾');
    } catch (err: any) {
      Toast.error(err?.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>文章内容</Text>
        <Text type="tertiary" size="small">{article.length} 字</Text>
      </div>

      <Space wrap style={{ marginBottom: 10 }}>
        <input
          ref={docxRef}
          type="file"
          accept=".docx"
          style={{ display: 'none' }}
          onChange={onDocxSelected}
        />
        <Button icon={<IconFile />} onClick={pickDocx} disabled={disabled}>
          上传 Word（.docx）
        </Button>
        {docxName && <Tag color="green" closable onClose={() => onDocxFile(null)}>{docxName}</Tag>}

        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onImageSelected}
        />
        <Button icon={<IconImage />} onClick={pickImage} loading={uploading} disabled={disabled}>
          上传图片（imgbb）
        </Button>
      </Space>

      <TextArea
        value={article}
        onChange={onArticleChange}
        placeholder="在此粘贴 Markdown 或纯文本文章；也可上传 .docx 由系统提取正文。标题用 #，加粗用 **，列表用 -。"
        autosize={{ minRows: 16, maxRows: 28 }}
        disabled={disabled}
        style={{ flex: 1 }}
      />
    </div>
  );
}
