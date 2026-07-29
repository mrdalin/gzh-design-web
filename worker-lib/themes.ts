import { THEME_INDEX_MD, REFERENCES } from './skillAssets';

export interface ThemeInfo {
  id: string; // 英文标识，如 moyu-green
  name: string; // 中文名
  mainColor: string;
  scenario: string;
  componentFile: string; // 如 references/theme-moyu-green.md
  underlineCss: string;
}

// 解析 theme-index.md 的表格，得到已注册主题列表（单一来源）。
export function parseThemes(md: string = THEME_INDEX_MD): ThemeInfo[] {
  const themes: ThemeInfo[] = [];
  const rowRe = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/;
  for (const line of md.split('\n')) {
    const m = line.match(rowRe);
    if (!m) continue;
    const name = m[1].trim();
    if (!name || name.includes('主题') || name.startsWith('--')) continue;
    const compFile = m[4].trim().replace(/`/g, '');
    const idMatch = compFile.match(/theme-([a-z0-9-]+)\.md/i);
    const id = idMatch ? idMatch[1] : '';
    themes.push({
      id,
      name,
      mainColor: extractHex(m[2]),
      scenario: m[3].trim().replace(/`/g, ''),
      componentFile: compFile,
      underlineCss: m[5].trim().replace(/`/g, ''),
    });
  }
  return themes;
}

export function getThemeById(id: string): ThemeInfo | undefined {
  return parseThemes().find((t) => t.id === id);
}

// 取得某主题对应的「组件库」markdown 原文（供拼进 LLM 提示词）。
export function getThemeComponentLib(themeId: string): string {
  const t = getThemeById(themeId);
  if (!t) return '';
  const fname = t.componentFile.split('/').pop() || '';
  return REFERENCES[fname] || '';
}

// 取得通用增量库（代码块/图片/小标签，所有主题共用）。
export function getCommonComponents(): string {
  return REFERENCES['common-components.md'] || '';
}

// 主题主色单元格形如 `#059669` emerald，这里只取第一个十六进制色值。
function extractHex(cell: string): string {
  const m = cell.match(/#[0-9a-fA-F]{3,8}/);
  if (m) return m[0];
  return cell.replace(/`/g, '').trim();
}
