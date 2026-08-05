import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Button,
  Typography,
  Toast,
  Modal,
  Space,
  Input,
  Select,
} from '@douyinfe/semi-ui';
import {
  IconCode,
  IconSend,
  IconArrowRight,
  IconSetting,
  IconImage,
  IconHistory,
} from '@douyinfe/semi-icons';
import type { HistoryItem, LayoutResult, StoredModel, Theme } from './types';
import { fetchThemes, layoutClientSideStream, liveClean, generateArticle, uploadImageB64 } from './lib/api';
import { htmlToMarkdown } from './lib/htmlToMarkdown';
import { markdownToHtml } from './lib/markdownToHtml';
import { useScrollSync } from './lib/useScrollSync';
import { countWords } from './lib/wordCount';
import mammoth from 'mammoth';
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
  loadDraft,
  saveDraft,
  clearDraft,
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

// 无 imgbb Key 时 Word 图片占位（可见灰块，提示用户配置图床后重传 Word）。
const PLACEHOLDER_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" font-family="-apple-system,Segoe UI,sans-serif" font-size="14" fill="#999" text-anchor="middle" dominant-baseline="middle">图片占位（配置「图片 API」后重传 Word 可自动上传）</text></svg>'
  );

// 模型是否「配置良好」：需 baseUrl + apiKey + model 三者齐全（预设模型的 Key 默认为空）。
function isModelConfigured(m?: StoredModel): boolean {
  return !!(m && m.baseUrl && m.apiKey && m.model);
}

export default function App() {
  // 草稿：刷新页面后从本地缓存恢复，避免编辑内容丢失
  const initialDraft = loadDraft();

  const [themes, setThemes] = useState<Theme[]>([]);
  const [commonComponents, setCommonComponents] = useState('');
  const [richHtml, setRichHtml] = useState(initialDraft?.richHtml || '');
  const [article, setArticle] = useState(initialDraft?.article || '');
  const [prompt, setPrompt] = useState('');

  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [customLib, setCustomLib] = useState('');
  const [customThemeName, setCustomThemeName] = useState('自定义主题');

  const [models, setModels] = useState<StoredModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');

  const [imgbbKey, setImgbbKey] = useState('');
  const [imgbbExpiry, setImgbbExpiry] = useState(0);

  // 当前选中主题名（用于导出文件名区分不同主题）
  const currentThemeName = useMemo(() => {
    if (!selectedThemeId) return '默认';
    if (selectedThemeId === 'custom') return customThemeName || '自定义';
    return themes.find((t) => t.id === selectedThemeId)?.name || '默认';
  }, [selectedThemeId, customThemeName, themes]);

  const [result, setResult] = useState<LayoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 指向中间 Markdown 编辑器的 <textarea>，用于「生成排版」时读取真实 DOM 内容，
  // 避免受 React 状态与 DOM 不同步影响（曾经出现「界面有内容却提示缺少文章内容」）。
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [gen, setGen] = useState<{ phase: string; partial: string; chars: number; inputTokens?: number; outputTokens?: number } | null>(null);
  // 生成完成后的 token 用量，留存于底部栏展示（gen 在 finally 中清空，故单独保存）
  const [lastUsage, setLastUsage] = useState<{ inputTokens?: number; outputTokens?: number } | null>(null);
  const playRef = useRef<number | null>(null);

  // 防止「富文本 → Markdown → 富文本」回环：当变更源自富文本编辑器时，临时屏蔽
  // Markdown 反向同步，避免来回改写导致光标跳动或内容被重写。
  const syncingFromRich = useRef(false);

  // 三栏联动滚动的容器 ref（富文本区 / Markdown 区 / 预览区）
  const richScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  // 生成过程中暂停联动，避免预览自动滚底带动其它区
  const syncEnabledRef = useRef(true);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [imgbbVisible, setImgbbVisible] = useState(false);
  const [modelVisible, setModelVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const [viewItem, setViewItem] = useState<HistoryItem | null>(null);
  const [readyForRegen, setReadyForRegen] = useState(false);

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

  // 草稿自动保存：富文本 / Markdown 任意一方变更后 600ms 防抖写入本地缓存。
  // 仅首次加载与生成结果展示不触发（生成结果走 history，不进草稿）。
  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft({ richHtml, article });
    }, 600);
    return () => clearTimeout(t);
  }, [richHtml, article]);

  // 生成进行时暂停三栏联动滚动，避免预览区自动滚底时把其它区也带到底部。
  useEffect(() => {
    syncEnabledRef.current = !(loading && gen);
  }, [loading, gen]);

  // 三栏按比例联动滚动：任一区域滚动，其余区域按相同比例跟随。
  useScrollSync([richScrollRef, mdTextareaRef, previewScrollRef], syncEnabledRef);

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

  // Markdown 区编辑 → 反向同步到富文本区（仅当变更非源自富文本编辑器时）
  function handleArticleChange(md: string) {
    setArticle(md);
    if (!syncingFromRich.current) {
      setRichHtml(markdownToHtml(md));
    }
  }

  // 富文本区 → 同步到 Markdown 区（粘贴/输入/失焦时触发）
  function handleRichAutoConvert(md: string) {
    syncingFromRich.current = true;
    setArticle(md);
    // 下一个渲染周期后解除屏蔽，避免误伤后续正常的 Markdown 编辑
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncingFromRich.current = false;
      });
    });
  }

  // 一键清除草稿：清空两端内容并删除本地缓存
  function clearDraftAll() {
    Modal.confirm({
      title: '清除草稿？',
      content:
        '将清空左侧文案与中间 Markdown 内容，并删除本地缓存的草稿。此操作不可撤销，但不会影响已生成的排版历史。',
      onOk: () => {
        syncingFromRich.current = true;
        setRichHtml('');
        setArticle('');
        clearDraft();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            syncingFromRich.current = false;
          });
        });
        Toast.success('草稿已清除');
      },
    });
  }

  // Word(.docx) 上传解析：用 mammoth 客户端提取文本与图片。
  // 图片：若已配置 imgbb Key 则自动上传并返回真实 URL；否则留占位图并提示用户先配置。
  async function handleDocxUpload(file: File) {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.docx') && !lower.endsWith('.doc')) {
      Toast.warning('仅支持 Word 文件（.docx / .doc）');
      return;
    }
    if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
      Toast.error('旧版 .doc 格式无法解析，请先将文件「另存为」.docx 后再上传');
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hasKey = !!imgbbKey?.trim();
      let imageFail = 0;
      const convertImage = mammoth.images.imgElement(async (image: any) => {
        const b64 = await image.read('base64');
        if (!hasKey) return { src: PLACEHOLDER_IMG };
        try {
          const res = await uploadImageB64(b64, imgbbKey, imgbbExpiry);
          return { src: res.url };
        } catch (e) {
          imageFail++;
          console.warn('[Word 图片上传失败]', e);
          return { src: PLACEHOLDER_IMG };
        }
      });
      const result = await mammoth.convertToMarkdown({ arrayBuffer }, {
        convertImage,
        styleMap: [
          "b[style-name='Heading 1'] => h1:fresh",
          "b[style-name='Heading 2'] => h2:fresh",
          "b[style-name='Heading 3'] => h3:fresh",
        ],
      });
      const md = result.value.trim();
      if (!md) {
        Toast.warning('Word 文件内容为空');
        return;
      }
      // 同时更新 Markdown 区和富文本区
      syncingFromRich.current = true;
      setArticle(md);
      setRichHtml(markdownToHtml(md));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncingFromRich.current = false;
        });
      });
      Toast.success(`Word 已解析为 Markdown（约 ${md.length} 字）`);
      if (result.messages.length > 0) {
        console.log('[Word 解析警告]', result.messages);
      }
      if (hasKey && imageFail > 0) {
        Toast.warning(`有 ${imageFail} 张图片上传失败（已留占位），请检查 imgbb Key 或网络`);
      } else if (!hasKey) {
        Toast.info('本文含图片：因未配置 imgbb 图床，图片已留占位；到右上角「图片 API」填写 Key 后重新上传 Word 即可自动上传图片');
      }
    } catch (e: any) {
      console.error('[Word 解析失败]', e);
      Toast.error('Word 文件解析失败，请确认是有效的 .docx 文件');
    }
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
    setLastUsage(null);
    setLoading(true);
    setReadyForRegen(false);
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
            const chars = countWords(clean);
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
          onUsage: (u) => {
            setGen((g) =>
              g
                ? { ...g, inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens }
                : g
            );
            setLastUsage({ inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens });
          },
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
      setReadyForRegen(false);
      setTimeout(() => setReadyForRegen(true), 1000);

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
    // 下拉末尾「添加自定义模型」→ 打开模型管理窗口
    if (id === '__add_custom__') {
      setModelVisible(true);
      return;
    }
    const m = models.find((x) => x.id === id);
    setSelectedModelId(id);
    saveLastModelId(id);
    // 选中了未配置（缺 API Key）的模型：提示并打开模型管理，引导填写
    if (m && !isModelConfigured(m)) {
      Toast.info('该模型尚未配置 API Key，请先在「模型 API」中填写');
      setModelVisible(true);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="app-logo">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, borderRadius: 5 }}>
            <rect width="32" height="32" rx="7" fill="url(#logoGrad)" />
            <rect x="7" y="9" width="18" height="2.2" rx="1.1" fill="white" opacity="0.95" />
            <rect x="7" y="14" width="14" height="2.2" rx="1.1" fill="white" opacity="0.85" />
            <rect x="7" y="19" width="16" height="2.2" rx="1.1" fill="white" opacity="0.75" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#07C160" />
                <stop offset="100%" stopColor="#069A4C" />
              </linearGradient>
            </defs>
          </svg>
          微信公众号 AI 排版
          <Text type="tertiary" size="small" style={{ opacity: 0.4, userSelect: 'none', fontWeight: 400, fontSize: 11 }}>
            v{APP_VERSION}
          </Text>
        </div>
        <Space>
          <Select
            size="small"
            style={{ width: 190 }}
            value={selectedModelId}
            onChange={(v) => handleModelSelect(v as string)}
            optionList={[
              ...models.map((m) => ({
                label: isModelConfigured(m)
                  ? (m.displayName || m.model)
                  : `${m.displayName || m.model}（未配置）`,
                value: m.id,
              })),
              { label: '➕ 添加自定义模型…', value: '__add_custom__' },
            ]}
            placeholder="选择模型"
          />
          <Button theme="borderless" icon={<IconHistory />} onClick={() => setHistoryVisible(true)}>
            排版历史
          </Button>
          {REPO_URL && (
            <Button theme="borderless" icon={<IconCode />} onClick={() => window.open(REPO_URL, '_blank')}>
              源码
            </Button>
          )}
          <Button theme="borderless" icon={<IconImage />} onClick={() => setImgbbVisible(true)}>
            图片 API
          </Button>
          <Button theme="borderless" icon={<IconSetting />} onClick={() => setModelVisible(true)}>
            模型 API
          </Button>
        </Space>
      </header>

      <ThemeBar
        themes={themes}
        value={selectedThemeId}
        customActive={customActive}
        customName={customThemeName}
        onSelect={handleThemeSelect}
        onOpenWizard={() => setWizardVisible(true)}
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
              onAutoConvert={handleRichAutoConvert}
              onClear={clearDraftAll}
              onDocxFile={handleDocxUpload}
              scrollRef={richScrollRef}
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
              onChange={handleArticleChange}
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
        themeName={currentThemeName}
        loading={loading}
        validation={result?.validation || null}
        onRegenerate={generate}
        stream={gen}
        usage={lastUsage}
        readyForRegenerate={readyForRegen}
        scrollRef={previewScrollRef}
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
