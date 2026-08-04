import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Typography,
  Toast,
  Select,
  Modal,
  Space,
  Input,
  Dropdown,
} from '@douyinfe/semi-ui';
import {
  IconCode,
  IconSend,
  IconArrowRight,
  IconHistory,
  IconSetting,
  IconImage,
} from '@douyinfe/semi-icons';
import type { HistoryItem, LayoutResult, StoredModel, Theme } from './types';
import { fetchThemes, layout, layoutClientSide, generateArticle } from './lib/api';
import { htmlToMarkdown } from './lib/htmlToMarkdown';
import {
  loadModels,
  saveModels,
  loadImgbbKey,
  saveImgbbKey,
  loadImgbbExpiry,
  saveImgbbExpiry,
  loadHistory,
  saveHistory,
  loadLastModelId,
  saveLastModelId,
  loadLastThemeId,
  saveLastThemeId,
  loadCustomLib,
  saveCustomLib,
} from './lib/storage';
import { copyRichText } from './lib/clipboard';
import { REPO_URL, APP_VERSION } from './config';

import ThemeBar from './components/ThemeBar';
import RichEditor from './components/RichEditor';
import MarkdownEditor from './components/MarkdownEditor';
import PreviewPanel from './components/PreviewPanel';
import HistoryDrawer from './components/HistoryDrawer';
import ImgbbConfigModal from './components/ImgbbConfigModal';
import ModelManager from './components/ModelManager';
import CustomThemeWizard from './components/CustomThemeWizard';

const { Text } = Typography;

export default function App() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [commonComponents, setCommonComponents] = useState('');
  const [richHtml, setRichHtml] = useState('');
  const [article, setArticle] = useState('');
  const [prompt, setPrompt] = useState('');

  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [customLib, setCustomLib] = useState('');
  const [customThemeName, setCustomThemeName] = useState('自定义主题');

  const [models, setModels] = useState<StoredModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');

  const [imgbbKey, setImgbbKey] = useState('');
  const [imgbbExpiry, setImgbbExpiry] = useState(0);

  const [result, setResult] = useState<LayoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 指向中间 Markdown 编辑器的 <textarea>，用于「生成排版」时读取真实 DOM 内容，
  // 避免受 React 状态与 DOM 不同步影响（曾经出现「界面有内容却提示缺少文章内容」）。
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [imgbbVisible, setImgbbVisible] = useState(false);
  const [modelVisible, setModelVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const [viewItem, setViewItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    fetchThemes()
      .then((data) => {
        setThemes(data.themes);
        setCommonComponents(data.commonComponents);
        const last = loadLastThemeId();
        if (last && data.themes.some((x) => x.id === last)) setSelectedThemeId(last);
        else if (data.themes[0]) setSelectedThemeId(data.themes[0].id);
      })
      .catch(() => Toast.error('主题列表加载失败，请确认已部署（需要 functions）'));

    const m = loadModels();
    setModels(m);
    const lastM = loadLastModelId();
    if (lastM && m.some((x) => x.id === lastM)) setSelectedModelId(lastM);
    else if (m[0]) setSelectedModelId(m[0].id);

    setImgbbKey(loadImgbbKey());
    setImgbbExpiry(loadImgbbExpiry());
    setHistory(loadHistory());
    const cl = loadCustomLib();
    if (cl) {
      setCustomLib(cl.html);
      setCustomThemeName(cl.name);
    }
  }, []);

  const customActive = selectedThemeId === 'custom';
  const currentModel = models.find((x) => x.id === selectedModelId);

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

  function convertToMarkdown() {
    if (!richHtml.replace(/<[^>]+>/g, '').trim()) {
      Toast.warning('左侧编辑器还没有内容');
      return;
    }
    const md = htmlToMarkdown(richHtml);
    setArticle(md);
    Toast.success('已转换为 Markdown，可在中间编辑器二次编辑');
  }

  async function generateFromPrompt() {
    if (!prompt.trim()) {
      Toast.warning('请输入提示词');
      return;
    }
    const m = currentModel;
    if (!m || !m.apiKey || !m.baseUrl || !m.model) {
      Toast.warning('请先在「配置 API」里配置并选择一个可用模型');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateArticle(prompt, {
        id: m.id,
        displayName: m.displayName,
        baseUrl: m.baseUrl,
        apiKey: m.apiKey,
        model: m.model,
      });
      setRichHtml(`<p>${res.article.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);
      setArticle(res.article);
      Toast.success('AI 文案已生成');
    } catch (e: any) {
      Toast.error(e?.message || '文案生成失败');
    } finally {
      setGenerating(false);
    }
  }

  async function generate() {
    const m = currentModel;
    if (!m || !m.apiKey || !m.baseUrl || !m.model) {
      Toast.warning('请先在「配置 API」里配置并选择一个可用模型');
      return;
    }
    // 以「中间 Markdown 编辑器实时 DOM 内容」为准，确保界面所见即所得。
    const liveArticle = (mdTextareaRef.current?.value ?? article).trim();
    if (!liveArticle) {
      Toast.warning('请先在中间 Markdown 编辑器里输入或转换文章');
      return;
    }
    // 若 DOM 与状态不一致（理论上不该发生），以 DOM 为准同步回状态。
    if (mdTextareaRef.current && mdTextareaRef.current.value !== article) {
      setArticle(mdTextareaRef.current.value);
    }
    if (!selectedThemeId) {
      Toast.warning('请在顶部选择一个主题');
      return;
    }
    if (selectedThemeId === 'custom' && !customLib) {
      Toast.warning('自定义主题尚未生成，请先在向导里生成');
      return;
    }

    setLoading(true);
    const genStartTime = Date.now();
    console.log('[排版诊断] 开始生成', {
      articleLen: liveArticle.length,
      themeId: selectedThemeId,
      model: m.model,
      baseUrl: m.baseUrl,
      version: APP_VERSION,
    });

    // 构建统一的模型参数（服务端/客户端共用）
    const modelParams = {
      id: m.id,
      displayName: m.displayName,
      baseUrl: m.baseUrl,
      apiKey: m.apiKey,
      model: m.model,
    };

    try {
      // ── 第一优先：尝试服务端模式（CF Functions）───────────────────
      let res: LayoutResult;
      try {
        console.log('[排版诊断] 模式=服务端, 发送请求到 /api/layout ...');
        const t0 = Date.now();
        res = await layout({
          article: liveArticle,
          themeId: selectedThemeId === 'custom' ? undefined : selectedThemeId,
          customLib: selectedThemeId === 'custom' ? customLib : undefined,
          model: modelParams,
        });
        console.log('[排版诊断] 服务端成功, 耗时', Date.now() - t0, 'ms, html长度:', res.html?.length || 0);
      } catch (serverErr: any) {
        // 服务端失败（通常是 CF 超时 → Failed to fetch）→ 自动降级到客户端直连
        if (serverErr.message?.includes('Failed to fetch') || serverErr.message?.includes('网络请求失败')) {
          console.warn('[排版诊断] 服务端失败（可能 CF 超时），自动切换到客户端直连模式...', serverErr.message);
          Toast.info('服务端超时，正在切换到浏览器直连模式…');
          const t1 = Date.now();
          // 把 commonComponents 附加到 themes 供客户端直连使用
          const themesWithCommon = themes.map((t) => ({ ...t, commonComponents }));
          res = await layoutClientSide({
            article: liveArticle,
            themeId: selectedThemeId === 'custom' ? undefined : selectedThemeId,
            customLib: selectedThemeId === 'custom' ? customLib : undefined,
            model: modelParams,
            themes: themesWithCommon,
          });
          console.log('[排版诊断] 客户端直连成功, 耗时', Date.now() - t1, 'ms, html长度:', res.html?.length || 0);
          Toast.success('浏览器直连模式排版完成');
        } else {
          // 其他错误（校验失败、参数错误等）不降级，直接抛出
          throw serverErr;
        }
      }

      // 前端最终防线：防止空结果覆盖已有预览并写入空白历史
      if (!res.html || !res.html.trim()) {
        Toast.error('排版结果为空，请重试或更换模型');
        return;
      }
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
      const elapsed = Date.now() - genStartTime;
      console.error('[排版诊断] 失败, 耗时', elapsed, 'ms', {
        name: e?.name,
        message: e?.message,
        stack: e?.stack?.slice(0, 500),
      });
      // 给用户一个可操作的诊断提示
      const detail = e?.message || '未知错误';
      let userMsg = detail;
      if (detail.includes('Failed to fetch') || detail.includes('网络请求失败')) {
        userMsg = `网络层失败（Failed to fetch）：请求发出后服务端未响应或连接被中断。可能原因：\n① Cloudflare 函数执行超时（免费版约 30s 限制）\n② 你的网络/代理/防火墙拦截了长连接\n③ 服务端未部署最新代码\n\n请按 F12 打开控制台查看「排版诊断」日志，并把红色信息截图发给我排查。\n总耗时：${Math.round(elapsed / 1000)}秒`;
      }
      Toast.error(userMsg);
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

  function handleImgbbSave(key: string, expiry: number) {
    saveImgbbKey(key);
    saveImgbbExpiry(expiry);
    setImgbbKey(key);
    setImgbbExpiry(expiry);
    Toast.success('图片 API 已保存到本机');
    setImgbbVisible(false);
  }

  function handleModelSelect(id: string) {
    setSelectedModelId(id);
    saveLastModelId(id);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="app-logo">
          <span style={{ color: 'var(--semi-color-primary)' }}>✍️</span>
          微信公众号 AI 排版
          <Text type="tertiary" size="small" style={{ opacity: 0.4, userSelect: 'none', fontWeight: 400, fontSize: 11 }}>
            v{APP_VERSION}
          </Text>
        </div>
        <Space>
          <Select
            style={{ width: 160 }}
            size="small"
            value={selectedModelId}
            onChange={(v) => handleModelSelect(v as string)}
            optionList={models.map((m) => ({
              label: m.apiKey ? m.model : (m.displayName || m.model),
              value: m.id,
            }))}
            placeholder="选择模型"
          />
          <Button theme="borderless" icon={<IconHistory />} onClick={() => setHistoryVisible(true)}>
            历史
          </Button>
          {REPO_URL && (
            <Button theme="borderless" icon={<IconCode />} onClick={() => window.open(REPO_URL, '_blank')}>
              源码
            </Button>
          )}
          <Dropdown trigger="click" position="bottomRight">
            <Button theme="borderless" icon={<IconSetting />}>
              配置 API
            </Button>
            <Dropdown.Menu>
              <Dropdown.Item icon={<IconImage />} onClick={() => setImgbbVisible(true)}>
                图片 API（imgbb 图床）
              </Dropdown.Item>
              <Dropdown.Item icon={<IconSetting />} onClick={() => setModelVisible(true)}>
                模型 API（AI 模型）
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Space>
      </header>

      <ThemeBar
        themes={themes}
        value={selectedThemeId}
        customActive={customActive}
        customName={customThemeName}
        onSelect={handleThemeSelect}
        onOpenWizard={() => setWizardVisible(true)}
        onOpenHistory={() => setHistoryVisible(true)}
        onOpenSettings={() => setModelVisible(true)}
      />

      <div className="app-shell app-shell-proto">
        {/* 左：富文本编辑器 */}
        <aside className="app-rich">
          <div className="app-rich-inner">
            <RichEditor
              html={richHtml}
              onChange={setRichHtml}
              imgbbKey={imgbbKey}
              imgbbExpiry={imgbbExpiry}
              disabled={generating}
              onNeedImgbbConfig={() => setImgbbVisible(true)}
            />

            <Button
              theme="solid"
              size="large"
              block
              onClick={convertToMarkdown}
              icon={<IconArrowRight />}
              style={{ marginTop: 12, flexShrink: 0 }}
            >
              转换为 Markdown →
            </Button>

            <div style={{ marginTop: 12, flexShrink: 0 }}>
              <Input
                value={prompt}
                onChange={(v) => setPrompt(v)}
                placeholder="输入提示语，让 AI 帮你生成文案…"
                disabled={generating}
                suffix={
                  <Button
                    theme="borderless"
                    icon={<IconSend />}
                    loading={generating}
                    disabled={!prompt.trim()}
                    onClick={generateFromPrompt}
                  />
                }
                onEnterPress={generateFromPrompt}
              />
            </div>
          </div>
        </aside>

        {/* 中：Markdown 编辑器 */}
        <main className="app-md">
          <div className="app-md-inner">
            <MarkdownEditor
              value={article}
              onChange={setArticle}
              imgbbKey={imgbbKey}
              imgbbExpiry={imgbbExpiry}
              disabled={loading}
              textareaRef={mdTextareaRef}
              onNeedImgbbConfig={() => setImgbbVisible(true)}
            />
            <Button
              theme="solid"
              size="large"
              block
              onClick={generate}
              loading={loading}
              icon={<IconSend />}
              style={{ marginTop: 12, flexShrink: 0 }}
            >
              生成排版 →
            </Button>
          </div>
        </main>

        {/* 右：预览 */}
        <aside className="app-preview">
          <PreviewPanel
            html={result?.html || ''}
            title={result?.title || ''}
            loading={loading}
            validation={result?.validation || null}
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

      <ImgbbConfigModal
        visible={imgbbVisible}
        onClose={() => setImgbbVisible(false)}
        imgbbKey={imgbbKey}
        expiry={imgbbExpiry}
        onSave={handleImgbbSave}
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
