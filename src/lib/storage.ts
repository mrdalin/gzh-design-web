import type { HistoryItem, StoredModel } from '../types';

// 所有用户配置只存本地浏览器（localStorage），不上传服务器，符合 BYOK 思路。
const KEYS = {
  models: 'gzh_models_v1',
  imgbb: 'gzh_imgbb_key_v1',
  history: 'gzh_history_v1',
  lastModelId: 'gzh_last_model_v1',
  lastThemeId: 'gzh_last_theme_v1',
  customLib: 'gzh_custom_lib_v1',
  customThemeName: 'gzh_custom_theme_name_v1',
};

const DEFAULT_MODELS: StoredModel[] = [
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    preset: true,
  },
  {
    id: 'kimi',
    displayName: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    model: 'moonshot-v1-8k',
    preset: true,
  },
];

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, v: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 忽略写入失败（如隐私模式） */
  }
}

export function loadModels(): StoredModel[] {
  const m = read<StoredModel[]>(KEYS.models, []);
  if (!m || m.length === 0) {
    write(KEYS.models, DEFAULT_MODELS);
    return DEFAULT_MODELS;
  }
  return m;
}

export function saveModels(models: StoredModel[]): void {
  write(KEYS.models, models);
}

export function loadImgbbKey(): string {
  return read<string>(KEYS.imgbb, '');
}

export function saveImgbbKey(k: string): void {
  write(KEYS.imgbb, k);
}

export function loadHistory(): HistoryItem[] {
  return read<HistoryItem[]>(KEYS.history, []);
}

export function saveHistory(h: HistoryItem[]): void {
  write(KEYS.history, h);
}

export function loadLastModelId(): string {
  return read<string>(KEYS.lastModelId, '');
}

export function saveLastModelId(id: string): void {
  write(KEYS.lastModelId, id);
}

export function loadLastThemeId(): string {
  return read<string>(KEYS.lastThemeId, '');
}

export function saveLastThemeId(id: string): void {
  write(KEYS.lastThemeId, id);
}

export function loadCustomLib(): { html: string; name: string } | null {
  const html = read<string>(KEYS.customLib, '');
  const name = read<string>(KEYS.customThemeName, '自定义主题');
  if (!html) return null;
  return { html, name };
}

export function saveCustomLib(html: string, name: string): void {
  write(KEYS.customLib, html);
  write(KEYS.customThemeName, name);
}

export function clearCustomLib(): void {
  write(KEYS.customLib, '');
  write(KEYS.customThemeName, '');
}

export { DEFAULT_MODELS };
