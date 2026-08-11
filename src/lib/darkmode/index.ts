// 预览深色模式 DOM 应用层：遍历预览容器，应用/恢复 mp-darkmode 颜色转换。
// 原值保存在 WeakMap（不污染 DOM），支持亮/暗反复切换与 DOM 重建后重新转换。
import {
  convertStyle,
  createContext,
  type DarkContext,
  type NodeColorState,
} from './strategy';

// 节点原始 inline style 缓存（key 为 DOM 节点，无泄漏）
const originals = new WeakMap<Element, string>();

// 解析 cssText → [prop, value] 列表（处理引号内分号，移植自官方 cssText 解析）
const SEMICOLON_PLACEHOLDER = '<$#_SEMICOLON_#$>';
function parseCssText(cssText: string): Array<[string, string]> {
  if (!cssText) return [];
  return cssText
    .replace(/("[^;]*);([^;]*")|('[^;]*);([^;]*')/g, `$1$3${SEMICOLON_PLACEHOLDER}$2$4`)
    .split(';')
    .map((str) => {
      const idx = str.indexOf(':');
      if (idx < 0) return null;
      const key = str.slice(0, idx).toLowerCase().trim();
      const value = str.slice(idx + 1).replace(new RegExp(SEMICOLON_PLACEHOLDER, 'g'), ';').trim();
      return [key, value] as [string, string];
    })
    .filter((x): x is [string, string] => !!x);
}

function writeCssKV(el: HTMLElement, kvList: Array<[string, string]>) {
  for (const [key, value] of kvList) {
    // inline style 的 !important 无法用 setProperty 表达，写入前去尾
    el.style.setProperty(key, value.replace(/ !important$/i, ''));
  }
}

function collectNodes(container: HTMLElement): HTMLElement[] {
  return [container, ...Array.from(container.querySelectorAll<HTMLElement>('*'))];
}

/**
 * 应用深色模式到预览容器（幂等：重复调用以原始亮色为输入，不会二次转换）。
 * 转换完成后调用 applyLight 即可恢复。
 */
export function applyDark(container: HTMLElement): void {
  const ctx: DarkContext = createContext();
  const stateMap = new Map<HTMLElement, NodeColorState>();
  stateMap.set(container, {});
  const nodes = collectNodes(container);
  for (const el of nodes) {
    // 取原始（亮色）样式作为转换输入；新 DOM 首次记录
    let orig = originals.get(el);
    if (orig === undefined) {
      orig = el.style.cssText;
      originals.set(el, orig);
    }
    const parentState = stateMap.get(el.parentElement as HTMLElement) || {};
    const { cssKVList, state } = convertStyle(ctx, parseCssText(orig), parentState);
    stateMap.set(el, state);
    writeCssKV(el, cssKVList);
  }
}

/** 恢复亮色（从 WeakMap 还原原始 inline style） */
export function applyLight(container: HTMLElement): void {
  for (const el of collectNodes(container)) {
    const orig = originals.get(el);
    if (orig !== undefined) el.style.cssText = orig;
  }
}

/** 当前容器是否处于深色模式（存在已记录的原值即视为已转换过） */
export function isDarkApplied(container: HTMLElement): boolean {
  return originals.has(container);
}
