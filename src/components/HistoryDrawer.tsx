import React, { useState } from 'react';
import {
  Button,
  Space,
  Toast,
  Typography,
  Checkbox,
  Popconfirm,
  Empty,
} from '@douyinfe/semi-ui';
import { IconDelete, IconCopy, IconEyeOpened, IconClose } from '@douyinfe/semi-icons';
import type { HistoryItem } from '../types';
import { copyRichText } from '../lib/clipboard';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onChange: (items: HistoryItem[]) => void;
  onView: (item: HistoryItem) => void;
  onUse: (item: HistoryItem) => void;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function HistoryDrawer({
  visible,
  onClose,
  items,
  onChange,
  onView,
  onUse,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string, checked: boolean) {
    setSelected((s) => (checked ? [...s, id] : s.filter((x) => x !== id)));
  }
  function onCheck(id: string, e: any) {
    const checked = typeof e === 'boolean' ? e : !!e?.target?.checked;
    toggle(id, checked);
  }

  async function copyItem(it: HistoryItem) {
    try {
      await copyRichText(it.html);
      Toast.success('已复制，可直接粘贴到公众号后台');
    } catch {
      Toast.error('复制失败，请改用「查看」里的复制按钮');
    }
  }

  function deleteItem(it: HistoryItem) {
    const next = items.filter((x) => x.id !== it.id);
    onChange(next);
    setSelected((s) => s.filter((x) => x !== it.id));
  }

  function batchDelete() {
    const next = items.filter((x) => !selected.includes(x.id));
    onChange(next);
    setSelected([]);
  }

  function clearAll() {
    onChange([]);
    setSelected([]);
    Toast.success('已清空所有排版历史');
  }

  return (
    <>
      <div className={`drawer-mask ${visible ? 'open' : ''}`} onClick={onClose} />
      <aside className={`drawer-panel ${visible ? 'open' : ''}`} aria-hidden={!visible}>
        <div className="drawer-header">
          <Text strong>排版历史（{items.length}）</Text>
          <Button theme="borderless" icon={<IconClose />} onClick={onClose} aria-label="关闭" />
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <Empty description="还没有排版记录，生成一次就会自动出现在这里" />
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className={'history-item' + (selected.includes(it.id) ? ' selected' : '')}
                onClick={() => onUse(it)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.includes(it.id)}
                      onChange={(e: any) => onCheck(it.id, e)}
                      style={{ marginTop: 2 }}
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong ellipsis={{ showTooltip: true }} style={{ maxWidth: 220 }}>
                        {it.title}
                      </Text>
                      <Text type="tertiary" size="small">
                        {it.themeName}
                      </Text>
                    </div>
                    <div className="history-snippet">{stripHtml(it.html).slice(0, 80)}</div>
                    <Text type="tertiary" size="small">
                      {fmtTime(it.createdAt)}
                    </Text>
                    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                      <Space>
                        <Button size="small" theme="borderless" icon={<IconEyeOpened />} onClick={() => onView(it)}>
                          查看
                        </Button>
                        <Button size="small" theme="borderless" icon={<IconCopy />} onClick={() => copyItem(it)}>
                          复制
                        </Button>
                        <Popconfirm title="删除该记录？" onConfirm={() => deleteItem(it)}>
                          <Button size="small" theme="borderless" type="danger" icon={<IconDelete />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="drawer-footer">
          {items.length > 0 ? (
            <Popconfirm title="确认清空全部历史记录？" onConfirm={clearAll}>
              <Button type="danger" size="small" icon={<IconDelete />}>
                清空全部
              </Button>
            </Popconfirm>
          ) : (
            <span />
          )}
          {selected.length > 0 ? (
            <Popconfirm title={`确认删除选中的 ${selected.length} 项？`} onConfirm={batchDelete}>
              <Button type="danger" icon={<IconDelete />}>
                批量删除（{selected.length}）
              </Button>
            </Popconfirm>
          ) : (
            <Text type="tertiary" size="small">勾选后可批量删除</Text>
          )}
        </div>
      </aside>
    </>
  );
}
