import React, { useEffect, useState } from 'react';
import {
  Button,
  Typography,
  Toast,
  Select,
  Modal,
  Space,
  Tag,
} from '@douyinfe/semi-ui';
import { IconHistory, IconSetting, IconCode, IconSend } from '@douyinfe/semi-icons';
import type { HistoryItem, LayoutResult, StoredModel, Theme } from './types';
import { fetchThemes, layout } from './lib/api';
import {
  loadModels,
  saveModels,
  loadImgbbKey,
  saveImgbbKey,
  loadHistory,
  saveHistory,
  loadLastModelId,
  saveLastModelId,
  loadLastThemeId,
  saveLastThemeId,
  loadCustomLib,
  saveCustomLib,
  clearCustomLib,
} from './lib/storage';
import { copyRichText } from './lib/clipboard';
import { REPO_URL } from './config';

import InputPanel from './components/InputPanel';
import ThemeSelect from './components/ThemeSelect';
import PreviewPanel from './components/PreviewPanel';
import HistoryDrawer from './components/HistoryDrawer';
import SettingsDrawer from './components/SettingsDrawer';
import ModelManager from './components/ModelManager';
import CustomThemeWizard from './components/CustomThemeWizard';

const { Text } = Typography;

export default function App() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [article, setArticle] = useState('');
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [docxName, setDocxName] = useState('');

  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [customLib, setCustomLib] = useState('');
  const [customThemeName, setCustomThemeName] = useState('自定义主题');

  const [models, setModels] = useState<StoredModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');

  const [imgbbKey, setImgbbKey] = useState('');

  const [result, setResult] = useState<LayoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [modelVisible, setModelVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const [viewItem, setViewItem] = useState<HistoryItem | null>(null);

  // 初始化：加载主题、本地配置
  useEffect(() => {
    fetchThemes()
      .then((t) => {
        setThemes(t);
        const last = loadLastThemeId();
        if (last && t.some((x) => x.id === last)) setSelectedThemeId(last);
        else if (t[0]) setSelectedThemeId(t[0].id);
      })
      .catch(() => Toast.error('主题列表加载失败，请确认已部署（需要 functions）'));

    const m = loadModels();
    setModels(m);
    const lastM = loadLastModelId();
    if (lastM && m.some((x) => x.id === lastM)) setSelectedModelId(lastM);
    else if (m[0]) setSelectedModelId(m[0].id);

    setImgbbKey(loadImgbbKey());
    setHistory(loadHistory());
    const cl = loadCustomLib();
    if (cl) {
      setCustomLib(cl.html);
      setCustomThemeName(cl.name);
    }
  }, []);

  const customActive = selectedThemeId === 'custom';

  function handleThemeSelect(id: string) {
    if (id === 'custom' && !customLib) {
      Toast.info('请先在「自定义主题」里生成一套风格');
      setWizardVisible(true);
      return;
    }
    setSelectedThemeId(id);
    saveLastThemeId(id);
  }

  function handleApplyCustom(html: string, name: string) {
    setCustomLib(html);
    setCustomThemeName(name);
    saveCustomLib(html, name);
    setSelectedThemeId('custom');
    saveLastThemeId('custom');
    Toast.success(`已应用主题「${name}」`);
  }

  async function generate() {
    const m = models.find((x) => x.id === selectedModelId);
    if (!m || !m.apiKey || !m.baseUrl || !m.model) {
      Toast.warning('请先在「设置 → 管理模型」里配置并选择一个可用模型');
      return;
    }
    if (!article.trim() && !docxFile) {
      Toast.warning('请先粘贴文章或上传 Word 文档');
      return;
    }
    if (!selectedThemeId) {
      Toast.warning('请选择一个主题');
      return;
    }
    if (selectedThemeId === 'custom' && !customLib) {
      Toast.warning('自定义主题尚未生成，请先在向导里生成');
      return;
    }

    setLoading(true);
    try {
      const res = await layout({
        article: docxFile ? undefined : article,
        file: docxFile || undefined,
        themeId: selectedThemeId === 'custom' ? undefined : selectedThemeId,
        customLib: selectedThemeId === 'custom' ? customLib : undefined,
        model: {
          id: m.id,
          displayName: m.displayName,
          baseUrl: m.baseUrl,
          apiKey: m.apiKey,
          model: m.model,
        },
      });
      setResult(res);

      const themeName =
        selectedThemeId === 'custom'
          ? customThemeName
          : themes.find((t) => t.id === selectedThemeId)?.name || '';
      const item: HistoryItem = {
        id: 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: res.title || '未命名排版',
        themeId: selectedThemeId,
        themeName,
        html: res.html,
        createdAt: Date.now(),
      };
      const next = [item, ...history].slice(0, 50);
      setHistory(next);
      saveHistory(next);
    } catch (e: any) {
      Toast.error(e?.message || '排版失败');
    } finally {
      setLoading(false);
    }
  }

  function handleUseHistory(it: HistoryItem) {
    setResult({ html: it.html, title: it.title, validation: { errors: [], warnings: [], leafCount: 0 } });
    setViewItem(null);
    setHistoryVisible(false);
  }

  async function handleCopyView() {
    if (!viewItem) return;
    try {
      await copyRichText(viewItem.html);
      Toast.success('已复制，可粘贴到公众号后台');
    } catch {
      Toast.error('复制失败');
    }
  }

  function handleModelsChange(next: StoredModel[]) {
    setModels(next);
    saveModels(next);
  }

  function handleModelSelect(id: string) {
    setSelectedModelId(id);
    saveLastModelId(id);
  }

  const currentModel = models.find((x) => x.id === selectedModelId);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="app-logo">
          <span style={{ color: 'var(--semi-color-primary)' }}>✍️</span>
          公众号排版工具
        </div>
        <Space>
          {REPO_URL && (
            <Button
              theme="borderless"
              icon={<IconCode />}
              onClick={() => window.open(REPO_URL, '_blank')}
            >
              源码
            </Button>
          )}
          <Button theme="borderless" icon={<IconHistory />} onClick={() => setHistoryVisible(true)}>
            历史
          </Button>
          <Button theme="borderless" icon={<IconSetting />} onClick={() => setSettingsVisible(true)}>
            设置
          </Button>
        </Space>
      </header>

      <div className="app-shell">
        {/* 左：主题 + 模型 + 生成 */}
        <aside className="app-sidebar">
          <div className="app-sidebar-inner">
            <ThemeSelect
              themes={themes}
              value={selectedThemeId}
              customActive={customActive}
              customName={customThemeName}
              onSelect={handleThemeSelect}
              onOpenWizard={() => setWizardVisible(true)}
            />

            <div style={{ marginTop: 16 }}>
              <Text strong>排版模型</Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  style={{ flex: 1 }}
                  value={selectedModelId}
                  onChange={(v) => handleModelSelect(v as string)}
                  optionList={models.map((m) => ({
                    label: m.displayName || m.model,
                    value: m.id,
                  }))}
                />
                <Button icon={<IconSetting />} onClick={() => setModelVisible(true)}>
                  管理
                </Button>
              </div>
              {currentModel && !currentModel.apiKey && (
                <Text type="warning" size="small">
                  当前模型未填写 API Key，请到「管理」中补全
                </Text>
              )}
            </div>

            <Button
              theme="solid"
              size="large"
              block
              onClick={generate}
              loading={loading}
              icon={<IconSend />}
              style={{ marginTop: 'auto' }}
            >
              生成排版
            </Button>
          </div>
        </aside>

        {/* 中：编辑器 */}
        <main className="app-editor">
          <InputPanel
            article={article}
            onArticleChange={setArticle}
            onDocxFile={(f) => {
              setDocxFile(f);
              setDocxName(f ? f.name : '');
            }}
            docxName={docxName}
            imgbbKey={imgbbKey}
            disabled={loading}
          />
        </main>

        {/* 右：预览（手机宽度） */}
        <aside className="app-preview">
          <PreviewPanel
            html={result?.html || ''}
            title={result?.title || ''}
            loading={loading}
            validation={result?.validation || null}
            onCopy={() => {}}
            onRegenerate={generate}
          />
        </aside>
      </div>

      <HistoryDrawer
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        items={history}
        onChange={(next) => {
          setHistory(next);
          saveHistory(next);
        }}
        onView={(it) => setViewItem(it)}
        onUse={handleUseHistory}
      />

      <SettingsDrawer
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        imgbbKey={imgbbKey}
        onImgbbChange={setImgbbKey}
        onOpenModels={() => {
          setSettingsVisible(false);
          setModelVisible(true);
        }}
      />

      <ModelManager
        visible={modelVisible}
        onClose={() => setModelVisible(false)}
        models={models}
        onChange={handleModelsChange}
        selectedId={selectedModelId}
        onSelect={handleModelSelect}
      />

      <CustomThemeWizard
        visible={wizardVisible}
        onClose={() => setWizardVisible(false)}
        onApply={handleApplyCustom}
        models={models}
        selectedModelId={selectedModelId}
      />

      <Modal
        visible={!!viewItem}
        onCancel={() => setViewItem(null)}
        width={760}
        title={`历史预览：${viewItem?.title || ''}`}
        footer={
          <Space>
            <Button onClick={() => setViewItem(null)}>关闭</Button>
            <Button theme="solid" icon={<IconCode />} onClick={handleCopyView}>
              复制排版
            </Button>
          </Space>
        }
      >
        {viewItem && (
          <div
            className="preview-frame"
            style={{ maxHeight: 520, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: viewItem.html }}
          />
        )}
      </Modal>
    </div>
  );
}
