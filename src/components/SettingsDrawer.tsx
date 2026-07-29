import React from 'react';
import { Modal, Button, Input, Typography, Space, Toast } from '@douyinfe/semi-ui';
import { IconSetting } from '@douyinfe/semi-icons';
import { saveImgbbKey } from '../lib/storage';

const { Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  imgbbKey: string;
  onImgbbChange: (k: string) => void;
  onOpenModels: () => void;
}

export default function SettingsDrawer({
  visible,
  onClose,
  imgbbKey,
  onImgbbChange,
  onOpenModels,
}: Props) {
  function save() {
    saveImgbbKey(imgbbKey);
    onImgbbChange(imgbbKey);
    Toast.success('设置已保存到本机');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={420}
      title="设置"
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button theme="solid" onClick={save}>保存</Button>
        </Space>
      }
    >
      <Text strong>图床（imgbb）</Text>
      <Paragraph type="secondary" size="small">
        用于「上传图片」功能。Key 仅保存在本机，经本站 Worker 代理转发到 imgbb，不会落库。
        在 imgbb.com 注册后可于 Dashboard → API Keys 获取。
      </Paragraph>
      <Input
        placeholder="imgbb API Key"
        type="password"
        value={imgbbKey}
        onChange={(v) => onImgbbChange(v)}
        style={{ marginBottom: 20 }}
      />

      <Text strong>模型</Text>
      <Paragraph type="secondary" size="small">
        配置用于排版的 AI 模型（DeepSeek / Kimi / 自定义 OpenAI 兼容端点）。
      </Paragraph>
      <Button icon={<IconSetting />} onClick={onOpenModels} block>
        管理模型
      </Button>
    </Modal>
  );
}
