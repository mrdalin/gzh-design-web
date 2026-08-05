// 主题色预设：用户可在右上角切换界面主色（按钮/链接/选中边框/浅色背景等）。
// 每套主题包含 Semi 主色族变量 + --semi-blue-5 通道变量（Semi 的 primary 实际是 rgba(var(--semi-blue-5),1)）
// + --gzh-accent（供 .theme-bar-hint 等品牌强调色使用）。
// 切换实现：运行时把对应变量注入 <style id="gzh-dynamic-theme">，覆盖 styles.css 的默认绿。
// 默认值保持「公众号绿」，与产品品牌一致；用户选择经 localStorage 持久化。

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
  accent: string; // 对应 --gzh-accent
}

export const COLOR_THEMES: ColorTheme[] = [
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
  },
  {
    id: 'white',
    name: '极简白',
    swatch: '#555555',
    primary: '#555555',
    primaryHover: '#6B6B6B',
    primaryActive: '#3F3F3F',
    primaryLightDefault: 'rgba(85, 85, 85, 0.10)',
    primaryLightHover: 'rgba(85, 85, 85, 0.15)',
    primaryLightActive: 'rgba(85, 85, 85, 0.20)',
    primaryDisabledBg: 'rgba(85, 85, 85, 0.30)',
    blue5: '85, 85, 85',
    accent: '#555555',
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
  }`;
  let style = document.getElementById('gzh-dynamic-theme') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'gzh-dynamic-theme';
    document.head.appendChild(style);
  }
  style.textContent = css;
}
