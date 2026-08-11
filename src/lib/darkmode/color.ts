// 颜色工具层：移植自 wechatjs/mp-darkmode（MIT）src/modules/color.js，
// 仅保留本项目用到的部分（感知亮度 / 亮度调整 / normal 混合），依赖 color 库。
import Color from 'color';

export { Color };

// 实例化 Color，传参非法返回 null（与原版一致）
export function parseColor(color: string | Color | null | undefined): Color | null {
  if (!color) return null;
  try {
    return color instanceof Color ? color : Color(color);
  } catch {
    return null;
  }
}

// 感知亮度（W3C AERT 加权平均）：https://www.w3.org/TR/AERT/#color-contrast
export function getColorPerceivedBrightness(rgb: number[]): number {
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}

// 调整为指定感知亮度（保留色相，只缩放 RGB）
export function adjustBrightnessTo(target: number, rgb: number[]): Color {
  const relativeBrightnessRatio = target / getColorPerceivedBrightness(rgb);
  let newTextR = Math.min(255, rgb[0] * relativeBrightnessRatio);
  let newTextG = Math.min(255, rgb[1] * relativeBrightnessRatio);
  let newTextB = Math.min(255, rgb[2] * relativeBrightnessRatio);
  if (newTextG === 0 || newTextR === 255 || newTextB === 255) {
    newTextG = (target * 1000 - newTextR * 299 - newTextB * 114) / 587;
  } else if (newTextR === 0) {
    newTextR = (target * 1000 - newTextG * 587 - newTextB * 114) / 299;
  } else if (newTextB === 0 || newTextG === 255) {
    newTextB = (target * 1000 - newTextR * 299 - newTextG * 587) / 114;
  }
  return Color.rgb(newTextR, newTextG, newTextB);
}

// normal 混合（alpha 合成）——替代原版 color-blend 的 'normal' 模式，避免引入依赖。
// colors 从底层（最远）到顶层（最近）排列，返回合成后的 Color。
export function mixNormal(colors: Color[]): Color {
  let result: Color | null = null;
  for (const c of colors) {
    if (!c) continue;
    const alpha = c.alpha();
    if (!result) {
      result = c;
      continue;
    }
    // result = c over result（c 在上层）
    const [r1, g1, b1]: number[] = result.rgb().array();
    const a1: number = result.alpha();
    const [r2, g2, b2]: number[] = c.rgb().array();
    const a2: number = alpha;
    const outA: number = a2 + a1 * (1 - a2);
    if (outA === 0) {
      result = Color.rgb(0, 0, 0).alpha(0);
      continue;
    }
    const outR: number = (r2 * a2 + r1 * a1 * (1 - a2)) / outA;
    const outG: number = (g2 * a2 + g1 * a1 * (1 - a2)) / outA;
    const outB: number = (b2 * a2 + b1 * a1 * (1 - a2)) / outA;
    result = Color.rgb(outR, outG, outB).alpha(outA);
  }
  return result || Color.rgb(0, 0, 0);
}

// 颜色字符串（含英文色名 / !important）→ 干净可解析的字符串
const COLOR_NAME_REG = /\b(black|silver|gray|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|orange|windowtext|transparent)\b/ig;

export function parseColorName(color: string): string {
  let c = color.replace(/ !important$/i, '').trim();
  c = c.replace(COLOR_NAME_REG, (m) => {
    const lower = m.toLowerCase();
    if (lower === 'transparent') return 'rgba(255,255,255,0)';
    if (lower === 'windowtext') return 'rgb(0,0,0)';
    const names: Record<string, string> = {
      black: 'rgb(0,0,0)', silver: 'rgb(192,192,192)', gray: 'rgb(128,128,128)',
      white: 'rgb(255,255,255)', maroon: 'rgb(128,0,0)', red: 'rgb(255,0,0)',
      purple: 'rgb(128,0,128)', fuchsia: 'rgb(255,0,255)', green: 'rgb(0,128,0)',
      lime: 'rgb(0,255,0)', olive: 'rgb(128,128,0)', yellow: 'rgb(255,255,0)',
      navy: 'rgb(0,0,128)', blue: 'rgb(0,0,255)', teal: 'rgb(0,128,128)',
      aqua: 'rgb(0,255,255)', orange: 'rgb(255,165,0)',
    };
    return names[lower] || m;
  });
  return c;
}

// 从一段 CSS 值中找出所有 rgb(a)(...) 颜色
const RGBA_REG = /\brgba?\([^)]+\)/ig;

export function extractColors(value: string): string[] {
  return value.match(RGBA_REG) || [];
}

// 把 hex(#fff/#ffffff/#ffffffff) 归一化为 rgb(a)，其余原样返回
const HEX_REG = /#[0-9a-f]{3,8}\b/ig;

export function normalizeCssColor(value: string): string {
  return value.replace(HEX_REG, (m) => {
    const c = parseColor(m);
    return c ? c.rgb().string() : m;
  });
}

export function isRgba(value: string): boolean {
  return RGBA_REG.test(value);
}
