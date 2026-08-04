import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Typography,
  Toast,
  Modal,
  Space,
  Input,
  Dropdown,
} from '@douyinfe/semi-ui';
import {
  IconCode,
  IconSend,
  IconArrowRight,
  IconSetting,
  IconImage,
} from '@douyinfe/semi-icons';
import type { HistoryItem, LayoutResult, StoredModel, Theme } from './types';
import { fetchThemes, layoutClientSideStream, liveClean, generateArticle } from './lib/api';
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
  const [gen, setGen] = useState<{ phase: string; partial: string; chars: number; inputTokens?: number; outputTokens?: number } | null>(null);
  const playRef = useRef<number | null>(null);

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

    setGen({
      phase: '正在唤醒排版小精灵 ✨',
      partial: '',
      chars: 0,
      inputTokens: undefined,
      outputTokens: undefined,
    });
    setLoading(true);
    const genStartTime = Date.now();
    console.log('[排版诊断] 开始生成（流式直连）', {
      articleLen: liveArticle.length,
      themeId: selectedThemeId,
      model: m.model,
      baseUrl: m.baseUrl,
      version: APP_VERSION,
    });

    // 首次 token 到达前循环播放俏皮话，缓解等待焦虑
    const playful = [
      '正在唤醒排版小精灵 ✨',
      '让文字们排好队 📝',
      '给重点词画下划线 🖍️',
      '调色板已就位 🎨',
      '金句卡片折叠中 🃏',
      '封面正在绘制 🖼️',
    ];
    let pi = 0;
    if (playRef.current) clearInterval(playRef.current);
    playRef.current = window.setInterval(() => {
      pi = (pi + 1) % playful.length;
      setGen((g) => (g && !g.partial ? { ...g, phase: playful[pi] } : g));
    }, 2400);

    const modelParams = {
      id: m.id,
      displayName: m.displayName,
      baseUrl: m.baseUrl,
      apiKey: m.apiKey,
      model: m.model,
    };

    try {
      // 客户端直连（流式）：浏览器直接调 LLM，绕过 CF 30s 超时限制
      console.log('[排版诊断] 模式=客户端直连·流, 直接调用 LLM ...');
      const t0 = Date.now();
      const themesWithCommon = themes.map((t) => ({ ...t, commonComponents }));
      const res = await layoutClientSideStream(
        {
          article: liveArticle,
          themeId: selectedThemeId === 'custom' ? undefined : selectedThemeId,
          customLib: selectedThemeId === 'custom' ? customLib : undefined,
          model: modelParams,
          themes: themesWithCommon,
        },
        {
          onFirstToken: () => {
            if (playRef.current) {
              clearInterval(playRef.current);
              playRef.current = null;
            }
            setGen((g) => (g ? { ...g, phase: '🎨 正在施展排版魔法…' } : g));
          },
          onChunk: (full) => {
            const clean = liveClean(full);
            const chars = clean.length;
            setGen((g) =>
              g
                ? {
                    ...g,
                    partial: clean,
                    chars,
                    phase:
                      chars < 300
                        ? '📝 正在构思文章骨架…'
                        : chars < 2000
                        ? '🎨 正在套用主题配色…'
                        : chars < 6000
                        ? '✍️ 正在逐段排版正文…'
                        : '🧩 正在拼接章节模块…',
                  }
                : g
            );
          },
          onUsage: (u) =>
            setGen((g) =>
              g
                ? { ...g, inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens }
                : g
            ),
        }
      );
      console.log('[排版诊断] 客户端直连·流成功, 耗时', Date.now() - t0, 'ms, html长度:', res.html?.length || 0);

      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
      setGen((g) => (g ? { ...g, phase: '🪄 正在打磨细节（清理残留 / 校验）…' } : g));

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
      const detail = e?.message || '未知错误';
      let userMsg = detail;
      if (detail.includes('Failed to fetch') || detail.includes('网络请求失败') || detail.includes('无法连接')) {
        userMsg = `连接模型服务失败：${detail}\n\n可能原因：\n① 网络不通或代理/防火墙拦截\n② API Key 无效或额度用尽\n③ 模型服务地址填错\n\n请按 F12 打开控制台查看「排版诊断」日志，并把红色信息截图发我。\n总耗时：${Math.round(elapsed / 1000)}秒`;
      }
      Toast.error(userMsg);
    } finally {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
      setLoading(false);
      setGen(null);
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
          {REPO_URL && (
            <Button theme="borderless" icon={<IconCode />} onClick={() => window.open(REPO_URL, '_blank')}>
              源码
            </Button>
          )}
          <Dropdown trigger="click" position="bottomRight">
            <Button theme="borderless" icon={<IconSetting />}>
              配置
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
        stream={gen}
        models={models}
        selectedModelId={selectedModelId}
        onModelSelect={handleModelSelect}
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
