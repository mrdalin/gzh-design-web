import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Button,
  Typography,
  Toast,
  Modal,
  Space,
  Input,
  Dropdown,
  Divider,
  Badge,
  Spin,
} from '@douyinfe/semi-ui';
import {
  IconCode,
  IconSend,
  IconArrowRight,
  IconSetting,
  IconImage,
  IconHistory,
  IconChevronDown,
  IconPlus,
  IconTick,
} from '@douyinfe/semi-icons';
import type { HistoryItem, LayoutResult, StoredModel, Theme } from './types';
import { ModelAvatar, isModelConfigured, modelLabel } from './modelIcons';
import { fetchThemes, layoutClientSideStream, liveClean, generateArticle, uploadImageB64 } from './lib/api';
import { htmlToMarkdown } from './lib/htmlToMarkdown';
import { markdownToHtml } from './lib/markdownToHtml';
import { PLACEHOLDER_IMG, sanitizeHtmlImages, sanitizeMdImages, cleanImageAlt } from './lib/imageSanitize';
import { useScrollSync } from './lib/useScrollSync';
import { countWords } from './lib/wordCount';
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
import { COLOR_THEMES, getStoredThemeId, applyTheme, applyFavicon, THEME_STORAGE_KEY } from './colorThemes';

import ThemeBar from './components/ThemeBar';
import RichEditor from './components/RichEditor';
import MarkdownEditor from './components/MarkdownEditor';
import PreviewPanel from './components/PreviewPanel';
import HistoryDrawer from './components/HistoryDrawer';
import ImgbbConfigModal from './components/ImgbbConfigModal';
import ModelManager from './components/ModelManager';
import CustomThemeWizard from './components/CustomThemeWizard';

const { Text } = Typography;

// GitHub 风格「Star」按钮图标（Octicons star，与 GitHub 完全一致）。
function GitHubStarIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
    </svg>
  );
}

// 模型是否「配置良好」：需 baseUrl + apiKey + model 三者齐全（预设模型的 Key 默认为空）。
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

  // GitHub 仓库 Star 数（用于顶栏「Star」按钮展示，失败则只显示 Star 不显示数字）。
  // 注：Star 按钮已暂时隐藏（见 header JSX 注释块），此状态与拉取逻辑一并停用。
  // const [starCount, setStarCount] = useState<number | null>(null);
  // useEffect(() => {
  //   if (!REPO_URL) return;
  //   const m = REPO_URL.match(/github\.com\/([^/]+)\/([^/]+)/);
  //   if (!m) return;
  //   const api = `https://api.github.com/repos/${m[1]}/${m[2]}`;
  //   fetch(api)
  //     .then((r) => (r.ok ? r.json() : null))
  //     .then((d: unknown) => {
  //       if (
  //         d &&
  //         typeof d === 'object' &&
  //         'stargazers_count' in d &&
  //         typeof (d as { stargazers_count?: unknown }).stargazers_count === 'number'
  //       ) {
  //         setStarCount((d as { stargazers_count: number }).stargazers_count);
  //       }
  //     })
  //     .catch(() => {
  //       /* 网络/限流失败时静默，仅显示 Star 不显示数字 */
  //     });
  // }, [REPO_URL]);

  // 界面主题色（按钮/链接/选中边框等主色），默认公众号绿，用户可在右上角切换并持久化。
  const [colorTheme, setColorTheme] = useState(getStoredThemeId());
  useEffect(() => {
    applyTheme(colorTheme);
    applyFavicon(colorTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, colorTheme);
    } catch {
      /* ignore */
    }
  }, [colorTheme]);

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
  // 上传 Word 防重入：处理中再次触发直接忽略，避免并发解析相互干扰。
  const docxBusyRef = useRef(false);
  // Word 图片正在后台上传 imgbb：true 时禁用「生成排版」按钮（内容尚未就绪）。
  const [wordImageUploading, setWordImageUploading] = useState(false);
  // 配置了 imgbb Key 时，Word 图片上传的全屏顶层进度（第 X / 共 Y 张），防止用户编辑并告知进度。
  const [wordUploadProgress, setWordUploadProgress] = useState<{ current: number; total: number } | null>(null);
  // Word 解析中（含图片后台上传）的受控状态：用于显示内联状态条，收尾时可靠消失，
  // 取代原先「duration:0 的 Toast」——那段 Toast 在某些情况下无法被正确关闭而常驻顶部。
  const [wordParsing, setWordParsing] = useState(false);

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
    if (id === 'custom') {
      // 点击「自定义主题」卡片统一进入向导：未生成则引导生成，已生成可重新生成/修改，
      // 应用成功后自动选中（handleApplyCustom 里 setSelectedThemeId('custom')）。
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
    // 富文本里的占位 SVG / 未上传成功的 base64 图先统一清洗成占位符，
    // 避免「转换为 Markdown」后中间编辑器出现 base64 长串。
    const md = htmlToMarkdown(sanitizeHtmlImages(richHtml));
    setArticle(sanitizeMdImages(md));
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
  // 方案 A+D：文字立即渲染，图片先以本地 dataURL 预览、后台并发上传 imgbb，
  // 上传完成后把 DOM 里的预览图替换为真实 URL，最后统一回写 Markdown 与富文本状态，
  // 避免「文字被图片上传阻塞」导致的长时间白屏 / 误以为解析失败。
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
    if (docxBusyRef.current) {
      Toast.warning('正在解析上一个 Word 文件，请稍候');
      return;
    }
    docxBusyRef.current = true;
    const hasKey = !!imgbbKey?.trim();
    // 解析中状态（受控内联状态条，收尾时由 setWordParsing(false) 可靠关闭，不再依赖 Toast.close）
    setWordParsing(true);
    try {
      // 懒加载 mammoth(含 bluebird/@xmldom/dingbat 等依赖约 670KB):仅首次上传 Word 时才下载,
      // 让主 bundle 不携带这些低频解析代码,显著缩小首屏体积。
      const mammoth = (await import('mammoth')).default;
      const arrayBuffer = await file.arrayBuffer();

      // dataURL 预览 → 真实 URL（或失败占位）的映射；上传完成后再回填 DOM
      const pending = new Map<string, string>();
      let totalImages = 0;
      let doneImages = 0;
      let imageFail = 0;
      let md = '';
      let finished = false;
      // 记录第一张图片的上报失败原因，用于 Toast 提示用户排查（Key 无效 / 网络异常 / 服务端错误等）
      let firstErrorReason = '';

      // 把已上传完成的预览图替换为真实 URL（幂等，可反复调用）
      const patchImages = () => {
        const editor = document.querySelector('.rich-editor');
        if (!editor) return;
        editor.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src') || '';
          if (src.startsWith('data:image') && pending.has(src)) {
            img.setAttribute('src', pending.get(src)!);
          }
        });
      };

      const finish = () => {
        if (finished) return;
        finished = true;
        patchImages();
        // 等一帧让 DOM 落地，再统一把真实 URL 回写进 React 状态（富文本 + Markdown）
        requestAnimationFrame(() => {
          const finalHtml = document.querySelector('.rich-editor')?.innerHTML || '';
          syncingFromRich.current = true;
          setRichHtml(finalHtml);
          // 关键：富文本 DOM 里可能仍残留 data:image（无 Key 时的 SVG 占位 / 上传失败占位 /
          // 解析中预览），先把这些 HTML 统一清洗为占位，再转 Markdown，
          // 确保 Markdown 编辑区永不出现 base64 长串；富文本区仍保留可视化灰占位。
          const sanitizedHtml = sanitizeHtmlImages(finalHtml);
          setArticle(sanitizeMdImages(htmlToMarkdown(sanitizedHtml)));
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              syncingFromRich.current = false;
            });
          });
          setWordParsing(false);
          setWordUploadProgress(null);
          Toast.success(
            `Word 已解析为 Markdown（约 ${md.length} 字${totalImages ? `，${totalImages} 张图片` : ''}）`
          );
          if (imageFail > 0) {
            const detail = firstErrorReason ? `（${firstErrorReason.slice(0, 120)}）` : '';
            Toast.warning(`有 ${imageFail} 张图片上传失败${detail}，已留占位；请检查「图片 API」配置或网络`);
          } else if (!hasKey && totalImages > 0) {
            Toast.info('本文含图片：因未配置 imgbb 图床，图片已留占位；到右上角「图片 API」填写 Key 后重新上传 Word 即可自动上传图片');
          }
        });
        docxBusyRef.current = false;
        setWordImageUploading(false);
      };

      const maybeFinish = () => {
        if (totalImages > 0 && doneImages >= totalImages) finish();
      };

      // 多图 Word：mammoth 会为每个图片几乎同时触发上传，直接并发会瞬间打满 imgbb
      // 免费额度（约 30 张/分钟）触发 429 限流。这里用「并发受限上传队列」（最多 3 张同时），
      // 配合 api.ts 内的 429 退避重试，确保几张到几十张图都能稳定传完。
      const MAX_CONCURRENT = 3;
      let activeUploads = 0;
      const uploadQueue: Array<() => Promise<void>> = [];
      const pumpUploads = () => {
        while (activeUploads < MAX_CONCURRENT && uploadQueue.length) {
          const task = uploadQueue.shift()!;
          activeUploads++;
          task().finally(() => { activeUploads--; pumpUploads(); });
        }
      };
      const enqueueUpload = (task: () => Promise<void>) => {
        uploadQueue.push(task);
        pumpUploads();
      };

      const convertImage = mammoth.images.imgElement(async (image: any) => {
        const b64 = await image.read('base64');
        totalImages++; // 无论是否有 Key，都计入图片总数，方便后续提示与进度展示
        if (!hasKey) return { src: PLACEHOLDER_IMG };
        const ct = image.contentType || 'image/png';
        const preview = `data:${ct};base64,${b64}`;
        // 后台并发上传（受队列并发上限约束），不阻塞文字解析；完成后回填真实 URL
        const ext = (image.contentType || 'image/png').split('/')[1] || 'png';
        const idx = totalImages;
        enqueueUpload(() =>
          uploadImageB64(b64, imgbbKey, imgbbExpiry, `word-image-${idx}.${ext}`, ct)
            .then((res: any) => {
              pending.set(preview, res.url);
            })
            .catch((e: any) => {
              imageFail++;
              const reason = e?.message || String(e);
              if (!firstErrorReason) firstErrorReason = reason;
              console.warn('[Word 图片上传失败]', e);
              pending.set(preview, PLACEHOLDER_IMG);
            })
            .finally(() => {
              doneImages++;
              setWordUploadProgress((prev) =>
                prev ? { ...prev, current: doneImages } : prev
              );
              patchImages();
              maybeFinish();
            })
        );
        return { src: preview };
      });

      // Word 导入用 convertToHtml 输出保真 HTML（加粗/标题/列表等真实标签），
      // 富文本区直接显示；Markdown 区由 htmlToMarkdown 转换（双向同步一致）。
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage,
        styleMap: [
          "b[style-name='Heading 1'] => h1:fresh",
          "b[style-name='Heading 2'] => h2:fresh",
          "b[style-name='Heading 3'] => h3:fresh",
        ],
      });
      const rawHtml = htmlResult.value.trim();
      // 转 Markdown 供 Markdown 编辑器使用
      md = htmlToMarkdown(rawHtml);
      if (!md) {
        setWordParsing(false);
        setWordUploadProgress(null);
        docxBusyRef.current = false;
        setWordImageUploading(false);
        Toast.warning('Word 文件内容为空');
        return;
      }

      // 清洗 mammoth 带出的原始图片 alt（如 C:\...\效果图3.jpg 这类本地路径/文件名），
      // 只保留文件名（去扩展名）；空 alt 用默认「图片」。
      md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) => {
        return `![${cleanImageAlt(alt)}](${url})`;
      });

      // Markdown 区用占位符替代巨大的 base64 dataURL（富文本区仍保留 dataURL 预览图）。
      // 占位格式：![图片 N（上传中…）](#pending) —— 短小清晰，finish() 时替换为真实 URL。
      let imgIdx = 0;
      const cleanMd = md.replace(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g, (_match, alt: string) => {
        imgIdx++;
        return `![图片 ${imgIdx}（上传中…）](${alt ? alt : '#pending'})`;
      });

      // 有图片且需要上传时，标记「图片上传中」以禁用生成排版按钮，并弹出全屏上传进度。
      const hasPendingImages = hasKey && totalImages > 0;
      if (hasPendingImages) {
        setWordImageUploading(true);
        setWordUploadProgress({ current: 0, total: totalImages });
      }

      // 同时更新 Markdown 区（占位符版）和富文本区（直接显示 convertToHtml 保真 HTML）
      syncingFromRich.current = true;
      setArticle(cleanMd);
      setRichHtml(rawHtml);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncingFromRich.current = false;
        });
      });
      if (htmlResult.messages.length > 0) {
        console.log('[Word 解析警告]', htmlResult.messages);
      }
      // 等富文本 DOM 渲染后再补图；无图片或无需上传则直接收尾
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          patchImages();
          if (totalImages === 0 || !hasKey) {
            finish();
          }
          // 有 Key 且有图片：由上传完成的 maybeFinish 收尾
        });
      });
    } catch (e: any) {
      setWordParsing(false);
      setWordUploadProgress(null);
      docxBusyRef.current = false;
      setWordImageUploading(false);
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
    // models state 在保存流程(刚保存尚未 re-render)中可能滞后,
    // 且 saveDraft 内 saveModels(nextModels) 已在 onSelect 前写入 localStorage,
    // 故 fallback 到 loadModels 确保拿到最新数据,避免刚保存的模型被误判为未配置。
    const latest = models.find((x) => x.id === id) || loadModels().find((x) => x.id === id);
    setSelectedModelId(id);
    saveLastModelId(id);
    // 选中了未配置（缺 API Key）的模型：提示并打开模型管理，引导填写
    if (latest && !isModelConfigured(latest)) {
      Toast.info('该模型尚未配置 API Key，请先点击 编辑 填写后使用');
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
                <stop offset="0%" style={{ stopColor: 'var(--gzh-accent, #069A4C)' }} />
                <stop offset="100%" style={{ stopColor: 'var(--gzh-accent-dark, #058A43)' }} />
              </linearGradient>
            </defs>
          </svg>
          <span className="app-logo-text">微信公众号 AI 排版</span>
          <Text className="header-version" type="tertiary" size="small" style={{ opacity: 0.4, userSelect: 'none', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
            v{APP_VERSION}
          </Text>
        </div>
        <Space spacing={12}>
          <span className="theme-color-switches" title="切换界面主题色">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-swatch${colorTheme === t.id ? ' active' : ''}`}
                style={{
                  background: t.swatch,
                  boxShadow:
                    colorTheme === t.id
                      ? `0 0 0 2px #fff, 0 0 0 4px ${t.swatch}`
                      : '0 0 0 1px rgba(0,0,0,0.12)',
                }}
                title={t.name}
                aria-label={t.name}
                onClick={() => setColorTheme(t.id)}
              />
            ))}
          </span>
          <Dropdown
            trigger="click"
            position="bottomLeft"
            className="model-select-dropdown"
            content={
              <div className="model-dropdown-menu">
                {models.map((m) => {
                  const active = m.id === selectedModelId;
                  return (
                    <div
                      key={m.id}
                      className={`model-dropdown-item${active ? ' active' : ''}`}
                      onClick={() => handleModelSelect(m.id)}
                    >
                      <ModelAvatar model={m} size={26} />
                      <span className="model-dropdown-name">{modelLabel(m)}</span>
                      {m.preset && (
                        <span className="model-dropdown-tag">预设</span>
                      )}
                      {active && (
                        <IconTick
                          style={{ marginLeft: 'auto', color: 'var(--gzh-accent)', flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
                <Divider style={{ margin: '6px 0' }} />
                <div
                  className="model-dropdown-item"
                  onClick={() => {
                    setModelVisible(true);
                  }}
                >
                  <IconPlus style={{ color: 'var(--gzh-accent)', flexShrink: 0 }} />
                  <span className="model-dropdown-name">管理模型 / 添加自定义</span>
                </div>
              </div>
            }
          >
            <Button className="header-action-btn model-select-trigger" theme="borderless">
              {(() => {
                const sel = models.find((m) => m.id === selectedModelId);
                return sel ? (
                  <ModelAvatar model={sel} size={22} />
                ) : (
                  <IconSetting />
                );
              })()}
              <span className="model-select-label">
                {(() => {
                  const sel = models.find((m) => m.id === selectedModelId);
                  return sel ? modelLabel(sel) : '选择模型';
                })()}
              </span>
              <span className="model-select-arrow">
                <IconChevronDown />
              </span>
            </Button>
          </Dropdown>
          {history.length > 0 ? (
            <Badge count={history.length} overflowCount={99} type="primary">
              <Button className="header-action-btn" icon={<IconHistory />} onClick={() => setHistoryVisible(true)}>
                <span className="header-btn-text">排版历史</span>
              </Button>
            </Badge>
          ) : (
            <Button className="header-action-btn" icon={<IconHistory />} onClick={() => setHistoryVisible(true)}>
              <span className="header-btn-text">排版历史</span>
            </Button>
          )}
          {/* Star 按钮暂隐藏，回头需要了再开启
          {REPO_URL && (
            <Button
              className="header-action-btn"
              icon={<GitHubStarIcon />}
              onClick={() => window.open(REPO_URL, '_blank')}
              aria-label="在 GitHub 上 Star 本项目"
            >
              <span className="header-btn-text">
                Star
                {starCount != null && starCount > 0 &&
                  (starCount >= 1000
                    ? ` ${(starCount / 1000).toFixed(1).replace(/\.0$/, '')}k`
                    : ` ${starCount}`)}
              </span>
            </Button>
          )}
          */}
          <Badge dot={!imgbbKey?.trim()} type="danger" position="rightTop">
            <Button className="header-action-btn" icon={<IconImage />} onClick={() => setImgbbVisible(true)}>
              <span className="header-btn-text">图片 API</span>
            </Button>
          </Badge>
          <Badge dot={!models.some(isModelConfigured)} type="danger" position="rightTop">
            <Button className="header-action-btn" icon={<IconSetting />} onClick={() => setModelVisible(true)}>
              <span className="header-btn-text">模型 API</span>
            </Button>
          </Badge>
        </Space>
      </header>

      <ThemeBar
        themes={themes}
        value={selectedThemeId}
        customActive={customActive}
        customName={customThemeName}
        onSelect={handleThemeSelect}
      />

      {wordParsing && (
        <div
          data-testid="word-parsing-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '8px 12px 0',
            padding: '8px 12px',
            background: 'var(--semi-color-primary-light-default, #e8f3ff)',
            color: 'var(--semi-color-text-0, #1c1f23)',
            borderRadius: 6,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          <Spin size="small" />
          <span>正在解析 Word，文字优先显示，图片稍后自动上传…</span>
        </div>
      )}

      {wordUploadProgress && (
        <div
          data-testid="word-upload-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Spin size="large" />
          <Text
            strong
            style={{
              fontSize: 16,
              color: 'var(--semi-color-text-0, #1c1f23)',
            }}
          >
            正在上传图片，已完成 {wordUploadProgress.current} / {wordUploadProgress.total} 张
          </Text>
          <Text
            type="tertiary"
            style={{ fontSize: 13 }}
          >
            上传完成前请勿编辑或切换内容
          </Text>
        </div>
      )}

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
              loading={loading || wordImageUploading}
              disabled={wordImageUploading}
              icon={wordImageUploading ? undefined : <IconSend />}
              style={{ marginTop: 12, flexShrink: 0 }}
            >
              {wordImageUploading ? '图片上传中，请稍候…' : '生成排版 →'}
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
        onManageModels={() => setModelVisible(true)}
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
