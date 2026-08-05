// 界面主题色预设：用户可在右上角切换界面主色（按钮/链接/选中边框/浅色背景等）。
// 每套主题包含 Semi 主色族变量 + --semi-blue-5 通道变量（Semi 的 primary 实际是 rgba(var(--semi-blue-5),1)）
// + --gzh-accent / --gzh-accent-dark（供 .theme-bar-hint、「logo / favicon」等品牌强调色使用）。
// 切换实现：运行时把对应变量注入 <style id="gzh-dynamic-theme">，覆盖 styles.css 的默认绿；
// 同时调用 applyFavicon 用主题色动态生成标签页图标，让 logo 与 favicon 也随主题色变化。
// 默认值保持「公众号绿」，与产品品牌一致；用户选择经 localStorage 持久化。
// 展示顺序：红（公众号橙红）→ 蓝（Semi 蓝）→ 绿（公众号绿）→ 黑（极简黑）。

export interface ColorTheme {
  id: string;
  name: string;
  swatch: string; // 右上角色块展示色
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLightDefault: string;
  primaryLightHover: string;
  primaryLightActive: string;
  primaryDisabledBg: string;
  blue5: string; // "R, G, B"，对应 --semi-blue-5
  accent: string; // 对应 --gzh-accent（品牌强调主色，渐变浅色）
  accentDark: string; // 对应 --gzh-accent-dark（渐变深端 / 暗色变体）
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'red',
    name: '公众号橙红',
    swatch: '#FA5151',
    primary: '#FA5151',
    primaryHover: '#FB6E6E',
    primaryActive: '#E64340',
    primaryLightDefault: 'rgba(250, 81, 81, 0.10)',
    primaryLightHover: 'rgba(250, 81, 81, 0.15)',
    primaryLightActive: 'rgba(250, 81, 81, 0.20)',
    primaryDisabledBg: 'rgba(250, 81, 81, 0.30)',
    blue5: '250, 81, 81',
    accent: '#FA5151',
    accentDark: '#E64340',
  },
  {
    id: 'blue',
    name: 'Semi 蓝',
    swatch: '#3491FA',
    primary: '#3491FA',
    primaryHover: '#5BA1FB',
    primaryActive: '#2A7DE1',
    primaryLightDefault: 'rgba(52, 145, 250, 0.10)',
    primaryLightHover: 'rgba(52, 145, 250, 0.15)',
    primaryLightActive: 'rgba(52, 145, 250, 0.20)',
    primaryDisabledBg: 'rgba(52, 145, 250, 0.30)',
    blue5: '52, 145, 250',
    accent: '#3491FA',
    accentDark: '#2A7DE1',
  },
  {
    id: 'green',
    name: '公众号绿',
    swatch: '#069A4C',
    primary: '#069A4C',
    primaryHover: '#18A85C',
    primaryActive: '#058A43',
    primaryLightDefault: 'rgba(6, 154, 76, 0.10)',
    primaryLightHover: 'rgba(6, 154, 76, 0.15)',
    primaryLightActive: 'rgba(6, 154, 76, 0.20)',
    primaryDisabledBg: 'rgba(6, 154, 76, 0.30)',
    blue5: '6, 154, 76',
    accent: '#069A4C',
    accentDark: '#058A43',
  },
  {
    id: 'black',
    name: '极简黑',
    swatch: '#333333',
    primary: '#333333',
    primaryHover: '#1F1F1F',
    primaryActive: '#000000',
    primaryLightDefault: 'rgba(51, 51, 51, 0.10)',
    primaryLightHover: 'rgba(51, 51, 51, 0.15)',
    primaryLightActive: 'rgba(51, 51, 51, 0.20)',
    primaryDisabledBg: 'rgba(51, 51, 51, 0.30)',
    blue5: '51, 51, 51',
    accent: '#333333',
    accentDark: '#1A1A1A',
  },
];

export const DEFAULT_THEME_ID = 'green';
export const THEME_STORAGE_KEY = 'gzh-theme-color';

export function getStoredThemeId(): string {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v && COLOR_THEMES.some((t) => t.id === v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID;
}

// 把选定主题的变量注入文档，覆盖 styles.css 默认绿。重复调用仅更新 <style> 内容。
export function applyTheme(themeId: string): void {
  const t = COLOR_THEMES.find((x) => x.id === themeId) ?? COLOR_THEMES.find((x) => x.id === DEFAULT_THEME_ID)!;
  const css = `:root, body, :host {
    --semi-color-primary: ${t.primary} !important;
    --semi-color-primary-hover: ${t.primaryHover} !important;
    --semi-color-primary-active: ${t.primaryActive} !important;
    --semi-color-primary-disabled-bg: ${t.primaryDisabledBg} !important;
    --semi-color-primary-disabled-text: rgba(255, 255, 255, 0.60) !important;
    --semi-color-primary-light-default: ${t.primaryLightDefault} !important;
    --semi-color-primary-light-hover: ${t.primaryLightHover} !important;
    --semi-color-primary-light-active: ${t.primaryLightActive} !important;
    --semi-blue-5: ${t.blue5} !important;
    --gzh-accent: ${t.accent} !important;
    --gzh-accent-dark: ${t.accentDark} !important;
  }`;
  let style = document.getElementById('gzh-dynamic-theme') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'gzh-dynamic-theme';
    document.head.appendChild(style);
  }
  style.textContent = css;
}

// 用当前主题色动态生成标签页图标（favicon），让 favicon 也随界面主题色变化。
// 生成的 SVG 与 header logo 同款样式（圆角底 + 白色段落线条 + 主题色渐变）。
export function applyFavicon(themeId: string): void {
  const t = COLOR_THEMES.find((x) => x.id === themeId) ?? COLOR_THEMES.find((x) => x.id === DEFAULT_THEME_ID)!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accentDark}"/>` +
    `</linearGradient></defs>` +
    `<rect x="24" y="24" width="464" height="464" rx="108" fill="url(#g)"/>` +
    `<g fill="#ffffff">` +
    `<rect x="148" y="156" width="216" height="24" rx="12" opacity="0.96"/>` +
    `<rect x="148" y="214" width="150" height="24" rx="12" opacity="0.7"/>` +
    `<rect x="148" y="272" width="216" height="24" rx="12" opacity="0.96"/>` +
    `<rect x="148" y="330" width="120" height="24" rx="12" opacity="0.55"/>` +
    `</g></svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}
