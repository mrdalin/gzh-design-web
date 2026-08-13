import React, { useEffect, useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
  Typography,
  Space,
  Toast,
  Card,
  InputNumber,
} from '@douyinfe/semi-ui';
import { IconImage, IconLink } from '@douyinfe/semi-icons';
import { IMGBB_EXPIRY_OPTIONS } from '../lib/storage';

const { Text, Paragraph, Title } = Typography;

const KNOWN = IMGBB_EXPIRY_OPTIONS.filter((o) => o.value !== -1).map((o) => o.value);

interface Props {
  visible: boolean;
  onClose: () => void;
  imgbbKey: string;
  // 单位秒；0 = 长期（永久），-1 = 自定义（由天数换算）
  expiry: number;
  onSave: (key: string, expiry: number) => void;
}

export default function ImgbbConfigModal({ visible, onClose, imgbbKey, expiry, onSave }: Props) {
  const [key, setKey] = useState(imgbbKey);
  const [showKey, setShowKey] = useState(false);
  // select 当前选中的有效期（秒；-1 表示自定义）
  const [selectVal, setSelectVal] = useState<number>(KNOWN.includes(expiry) ? expiry : -1);
  // 自定义天数
  const [customDays, setCustomDays] = useState<number>(
    !KNOWN.includes(expiry) && expiry > 0 ? Math.round(expiry / 86400) : 7
  );

  // 每次打开时同步外部最新值
  useEffect(() => {
    if (visible) {
      setKey(imgbbKey);
      setShowKey(false);
      setSelectVal(KNOWN.includes(expiry) ? expiry : -1);
      setCustomDays(!KNOWN.includes(expiry) && expiry > 0 ? Math.round(expiry / 86400) : 7);
    }
  }, [visible, imgbbKey, expiry]);

  function effectiveExpiry(): number {
    if (selectVal === -1) return Math.max(1, customDays || 1) * 86400;
    return selectVal;
  }

  function handleSave() {
    if (!key.trim()) {
      Toast.warning('请先填写 imgbb API Key');
      return;
    }
    onSave(key.trim(), effectiveExpiry());
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={460}
      title="图片 API 配置（imgbb 图床）"
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button theme="solid" onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      {/* 上半部分：注册引导 */}
      <Card
        style={{ marginBottom: 18, background: 'var(--semi-color-fill-0)' }}
        bodyStyle={{ padding: 16 }}
      >
        <Title heading={6} style={{ margin: '0 0 8px' }}>
          如何获取 imgbb API Key？
        </Title>
        <Paragraph type="secondary" size="small" style={{ margin: '0 0 8px' }}>
          本站「上传图片」依赖 imgbb 免费图床做图片托管（图片会出现在公众号文章里）。
          配置一次即可长期使用，Key 仅保存在你本机浏览器，经本站 Worker 代理转发，不会落库。
        </Paragraph>
        <Paragraph type="secondary" size="small" style={{ margin: '0 0 10px' }}>
          步骤：打开 imgbb 官网 → 注册 / 登录 → 进入 Dashboard → API Keys → 复制 API Key 粘贴到下方。
        </Paragraph>
        <Button
          icon={<IconLink />}
          theme="light"
          onClick={() => window.open('https://api.imgbb.com/', '_blank')}
        >
          前往 imgbb 注册 / 获取 Key
        </Button>
      </Card>

      {/* 下半部分：填写 Key + 有效期 */}
      <Text strong>imgbb API Key</Text>
      <Input
        style={{ marginTop: 8, marginBottom: 16 }}
        placeholder="粘贴你的 imgbb API Key"
        type="text"
        autoComplete="off"
        className={showKey ? undefined : 'key-visually-hidden'}
        value={key}
        onChange={(v) => setKey(v)}
        suffix={
          <Button
            theme="borderless"
            size="small"
            onClick={() => setShowKey((s) => !s)}
          >
            {showKey ? '隐藏' : '显示'}
          </Button>
        }
      />

      <Text strong>图片有效期</Text>
      <Select
        style={{ marginTop: 8, width: '100%' }}
        value={selectVal}
        onChange={(v) => setSelectVal(v as number)}
        optionList={IMGBB_EXPIRY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
      />
      {selectVal === -1 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="tertiary" size="small">
            自定义天数：
          </Text>
          <InputNumber
            min={1}
            max={180}
            value={customDays}
            onChange={(v) => setCustomDays((v as number) || 1)}
            style={{ width: 120 }}
          />
          <Text type="tertiary" size="small">
            天（最长 180 天）
          </Text>
        </div>
      )}

      <Paragraph type="tertiary" size="small" style={{ marginTop: 14, marginBottom: 0 }}>
        <IconImage style={{ marginRight: 4 }} />
        长期（永久）模式下图片不会被 imgbb 自动删除；设置较短有效期可在一段时间后自动清理。
      </Paragraph>
    </Modal>
  );
}
