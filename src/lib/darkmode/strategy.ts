// 核心转换策略：移植自 wechatjs/mp-darkmode（MIT）src/modules/sdk.js + constant.js，
// 保留官方颜色转换算法（感知亮度 / HSL 取反 / 对比度阈值 / 渐变 mix / 背景图补色），
// 剥离 DOM 与全局样式注入，输出「样式键值对 + 透传状态」供上层 DOM 应用。
import Color from 'color';
import {
  parseColor,
  getColorPerceivedBrightness,
  adjustBrightnessTo,
  mixNormal,
  parseColorName,
  normalizeCssColor,
  extractColors,
} from './color';

// ---- 常量（与官方 constant.js 一致）----
const WHITE_LIKE_COLOR_BRIGHTNESS = 250;
const MAX_LIMIT_BGCOLOR_BRIGHTNESS = 190;
const MIN_LIMIT_OFFSET_BRIGHTNESS = 65;
const HIGH_BGCOLOR_BRIGHTNESS = 100;
const HIGH_BLACKWHITE_HSL_BRIGHTNESS = 40;
const LOW_BLACKWHITE_HSL_BRIGHTNESS = 22;
const IGNORE_ALPHA = 0.05;

export const DEFAULT_LIGHT_TEXTCOLOR = '#191919';
export const DEFAULT_LIGHT_BGCOLOR = '#ffffff';
export const DEFAULT_DARK_TEXTCOLOR = '#a3a3a3';
export const DEFAULT_DARK_BGCOLOR = '#191919';

// ---- CSS 属性分类（与官方 constant.js 一致）----
const BG_COLOR_PROPS = ['background-color', 'background-image', 'background'];
const TEXT_COLOR_PROPS = [
  '-webkit-text-stroke', '-webkit-text-stroke-color', 'text-decoration',
  'text-decoration-color', 'text-emphasis-color', 'color', '-webkit-text-fill-color',
];
const BORDER_COLOR_PROPS = [
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color',
  'border-left-color', 'border-block-color', 'border-block-start-color',
  'border-block-end-color', 'border-inline-color', 'border-inline-start-color',
  'border-inline-end-color', 'outline', 'outline-color', 'box-shadow',
  'column-rule', 'column-rule-color',
];
const TEXT_SHADOW_PROPS = ['text-shadow'];

export const COLOR_PROPS = new Set<string>([
  ...BG_COLOR_PROPS, ...TEXT_COLOR_PROPS, ...BORDER_COLOR_PROPS, ...TEXT_SHADOW_PROPS,
]);

// ---- 上下文 ----
export interface DarkContext {
  defaultDarkTextColorBrightness: number;
  defaultDarkBgColorBrightness: number;
  defaultDarkBgColorHslBrightness: number;
  maxLimitOffsetBrightness: number;
}

export function createContext(): DarkContext {
  const dText = parseColor(DEFAULT_DARK_TEXTCOLOR)!.rgb().array();
  const dBg = parseColor(DEFAULT_DARK_BGCOLOR)!.rgb().array();
  const dBgHsl = parseColor(DEFAULT_DARK_BGCOLOR)!.hsl().array();
  return {
    defaultDarkTextColorBrightness: getColorPerceivedBrightness(dText),
    defaultDarkBgColorBrightness: getColorPerceivedBrightness(dBg),
    defaultDarkBgColorHslBrightness: dBgHsl[2],
    maxLimitOffsetBrightness: getColorPerceivedBrightness(dText) - getColorPerceivedBrightness(dBg),
  };
}

// ---- 节点透传状态（替代官方的 data-* 属性）----
export interface NodeColorState {
  /** 转换后的背景色（透传给子节点做文字亮度计算） */
  bgColor?: string;
  /** 原始背景色（背景图补色用） */
  originalBgColor?: string;
  /** 转换后的文字色（透传） */
  color?: string;
  /** 原始文字色（父继承或自身设置） */
  originalColor?: string;
  /** 是否处于背景图上（字体颜色豁免转换，保证可读） */
  bgImage?: boolean;
}

// 背景色：灰白高亮取反 / 高感知亮度降 / 低亮度提（官方 _adjustBackgroundBrightness）
function adjustBackgroundBrightness(ctx: DarkContext, bgColor: Color): Color {
  const rgb = bgColor.rgb().array();
  const hsl = bgColor.hsl().array();
  const alpha = bgColor.alpha();
  const perceived = getColorPerceivedBrightness(rgb);
  let newColor = bgColor;
  if ((hsl[1] === 0 && hsl[2] > HIGH_BLACKWHITE_HSL_BRIGHTNESS)
    || perceived > WHITE_LIKE_COLOR_BRIGHTNESS) {
    // 黑白灰（饱和度 0）亮度较高，或接近白色：做亮度取反（白→深）
    newColor = Color.hsl(0, 0, Math.min(100, 100 + ctx.defaultDarkBgColorHslBrightness - hsl[2]));
  } else if (perceived > MAX_LIMIT_BGCOLOR_BRIGHTNESS) {
    newColor = adjustBrightnessTo(MAX_LIMIT_BGCOLOR_BRIGHTNESS, rgb).alpha(alpha);
  } else if (hsl[2] < LOW_BLACKWHITE_HSL_BRIGHTNESS) {
    hsl[2] = LOW_BLACKWHITE_HSL_BRIGHTNESS;
    newColor = Color.hsl(...hsl);
  }
  return newColor.alpha(alpha).rgb();
}

// 文字色：按背景感知亮度差调整（官方 _adjustTextBrightness）
function adjustTextBrightness(ctx: DarkContext, textColor: Color, bgColor: Color): Color {
  const bgColorRgb = bgColor.rgb().array();
  const bgColorAlpha = bgColor.alpha();
  const bgColorPerceivedBrightness = getColorPerceivedBrightness(bgColorRgb);
  const bgColorWithOpacityPerceivedBrightness = bgColorPerceivedBrightness * bgColorAlpha
    + ctx.defaultDarkBgColorBrightness * (1 - bgColorAlpha);
  const textColorRgb = textColor.rgb().array();
  const textColorHSL = textColor.hsl().array();
  const textColorAlpha = textColor.alpha();
  const textPerceivedBrightness = getColorPerceivedBrightness(textColorRgb);
  const offsetPerceivedBrightness = Math.abs(bgColorWithOpacityPerceivedBrightness - textPerceivedBrightness);

  // 高亮字体（接近白色）不处理，保持高亮
  if (textPerceivedBrightness >= WHITE_LIKE_COLOR_BRIGHTNESS) return textColor;

  if (offsetPerceivedBrightness > ctx.maxLimitOffsetBrightness
    && bgColorWithOpacityPerceivedBrightness <= ctx.defaultDarkBgColorBrightness + 2) {
    return adjustBrightnessTo(ctx.maxLimitOffsetBrightness + bgColorWithOpacityPerceivedBrightness,
      textColorRgb).alpha(textColorAlpha);
  }

  // 感知亮度差已足够，无需调整
  if (offsetPerceivedBrightness >= MIN_LIMIT_OFFSET_BRIGHTNESS) return textColor;

  if (bgColorWithOpacityPerceivedBrightness >= HIGH_BGCOLOR_BRIGHTNESS) {
    // 亮背景：调暗字体（优先 HSL 取反）
    if (textColorHSL[2] > 90 - HIGH_BLACKWHITE_HSL_BRIGHTNESS) {
      textColorHSL[2] = 90 - textColorHSL[2];
      const tmp = Color.hsl(...textColorHSL).alpha(textColorAlpha);
      return adjustTextBrightness(ctx, tmp, bgColor);
    }
    return adjustBrightnessTo(Math.min(ctx.maxLimitOffsetBrightness,
      bgColorWithOpacityPerceivedBrightness - MIN_LIMIT_OFFSET_BRIGHTNESS),
      textColorRgb).alpha(textColorAlpha);
  }
  // 暗背景：调亮字体
  if (textColorHSL[2] <= HIGH_BLACKWHITE_HSL_BRIGHTNESS) {
    textColorHSL[2] = 90 - textColorHSL[2];
    const tmp = Color.hsl(...textColorHSL).alpha(textColorAlpha);
    return adjustTextBrightness(ctx, tmp, bgColor);
  }
  return adjustBrightnessTo(Math.min(ctx.maxLimitOffsetBrightness,
    bgColorWithOpacityPerceivedBrightness + MIN_LIMIT_OFFSET_BRIGHTNESS),
    textColorRgb).alpha(textColorAlpha);
}

// 渐变色 mix 成纯色（官方 mixColors 默认 mix 模式：color.mix 链式）
function mixGradientColors(colors: string[]): Color | null {
  let acc: Color | null = null;
  for (const c of colors) {
    const cc = parseColor(c);
    if (!cc) continue;
    if (!acc) {
      acc = cc;
      continue;
    }
    acc = acc.mix(cc, cc.alpha());
  }
  return acc;
}

interface AdjustOptions {
  isBgColor: boolean;
  isTextColor: boolean;
  isBorderColor: boolean;
  isTextShadow: boolean;
  hasInlineColor: boolean;
  /** 父/自身背景色（文字/边框用） */
  parentBgColorStr?: string;
}

// 单属性颜色调整入口（官方 _adjustBrightness，剥离 el 存取）
function adjustBrightness(ctx: DarkContext, color: Color, opts: AdjustOptions, state: NodeColorState): Color | null {
  const alpha = color.alpha();

  if (opts.isBgColor) {
    if (alpha >= IGNORE_ALPHA) {
      // 有可见背景色：取消背景图影响（恢复文字转换）
      state.bgImage = false;
    }
    return adjustBackgroundBrightness(ctx, color);
  }

  if (opts.isTextColor || opts.isBorderColor) {
    const parentBgStr = opts.parentBgColorStr
      || (opts.isTextColor ? state.bgColor : undefined)
      || DEFAULT_DARK_BGCOLOR;
    const parentBg = parseColor(parentBgStr);
    if (parentBg && !state.bgImage) {
      return adjustTextBrightness(ctx, color, parentBg);
    }
    return null;
  }

  if (opts.isTextShadow) {
    if (!state.bgImage) {
      return adjustBackgroundBrightness(ctx, color);
    }
    return null;
  }
  return null;
}

export interface ConvertResult {
  /** 转换后的样式键值对（与原属性一一对应，未变化的属性原样返回） */
  cssKVList: Array<[string, string]>;
  /** 处理后的透传状态（供子节点使用） */
  state: NodeColorState;
}

/**
 * 转换一个节点的内联样式列表。
 * @param ctx       全局上下文（createContext 一次）
 * @param cssKVList 节点内联样式解析后的 [prop, value] 列表
 * @param parentState 父节点透传状态（背景色/文字色/背景图标记）
 * @param isRoot    是否根节点（预览容器自身，文字色不回写）
 */
export function convertStyle(
  ctx: DarkContext,
  cssKVList: Array<[string, string]>,
  parentState: NodeColorState,
): ConvertResult {
  const state: NodeColorState = {
    bgColor: parentState.bgColor,
    originalBgColor: parentState.originalBgColor,
    color: parentState.color,
    originalColor: parentState.originalColor,
    bgImage: parentState.bgImage,
  };

  let hasInlineColor = false;
  let hasInlineBackgroundImage = false;

  // 预处理：分类标记 + 过滤只留颜色属性 + 排序（color 最后，background-image 在 color 后）
  const filtered = cssKVList
    .filter(([key, value]) => {
      if (key === 'color') hasInlineColor = true;
      if ((/background/i.test(key) || /^(-webkit-)?border-image/.test(key))
        && /url\([^)]*\)/i.test(value)) {
        hasInlineBackgroundImage = true;
      }
      return COLOR_PROPS.has(key);
    })
    .sort(([k1], [k2]) => {
      if (k1 === 'color') return 1;
      if (k1 === 'background-image' && k2 === 'background-color') return 1;
      if (k2.indexOf('-webkit-text') === 0) return 1;
      return -1;
    });

  const out: Array<[string, string]> = [];

  for (const [key, rawValue] of filtered) {
    const value = normalizeCssColor(parseColorName(rawValue));
    const isBgColor = BG_COLOR_PROPS.includes(key);
    const isTextShadow = TEXT_SHADOW_PROPS.includes(key);
    const isTextColor = TEXT_COLOR_PROPS.includes(key);
    const isBorderColor = BORDER_COLOR_PROPS.includes(key);
    const isGradient = /gradient/.test(value);
    const isBackgroundAttr = /^background/.test(key);
    const isBorderImageAttr = /^(-webkit-)?border-image/.test(key);
    const hasUrl = /url\([^)]*\)/i.test(value);

    // ---- 背景图 / 边框图：补底色 + 字体豁免 ----
    if (!(key === 'color') && (isBackgroundAttr || isBorderImageAttr) && hasUrl) {
      state.bgImage = true;
      let newValue = value;
      if (isBackgroundAttr) {
        const imgBgColor = mixNormal(
          (state.originalBgColor || DEFAULT_LIGHT_BGCOLOR).split('|').map((s) => parseColor(s) as Color),
        ).toString();
        // 背景图下叠一层原背景色，保证图上文字（豁免转换）可读
        newValue = `${value},linear-gradient(${imgBgColor}, ${imgBgColor})`;
      }
      // 背景图节点文字豁免：不转换字体色，使用原默认文字色
      if (!hasInlineColor) {
        const textColor = state.originalColor || DEFAULT_LIGHT_TEXTCOLOR;
        out.push(['color', textColor]);
        state.color = textColor;
        state.originalColor = textColor;
      }
      out.push([key, newValue]);
      continue;
    }

    // ---- 渐变：mix 成纯色 ----
    let replacedValue = value;
    if (isGradient && isBgColor) {
      const gradientColors = extractColors(value);
      const mixColor = mixGradientColors(gradientColors);
      if (mixColor) {
        replacedValue = mixColor.toString();
      }
    }

    const colorMatch = /rgba?\([^)]+\)/i.exec(replacedValue);
    if (!colorMatch) {
      out.push([key, rawValue]);
      continue;
    }

    // 逐颜色处理（非渐变通常只有一个）
    let changed = false;
    const newValue = replacedValue.replace(/rgba?\([^)]+\)/ig, (match) => {
      const color = parseColor(match);
      if (!color || color.alpha() < IGNORE_ALPHA) return match;
      const ret = adjustBrightness(ctx, color, {
        isBgColor,
        isTextColor,
        isBorderColor,
        isTextShadow,
        hasInlineColor,
        parentBgColorStr: isTextColor || isBorderColor ? state.bgColor : undefined,
      }, state);
      if (ret) {
        changed = true;
        const retStr = ret.alpha(color.alpha()).rgb().toString();
        // 背景/文字色透传子节点
        if (isBgColor) {
          state.bgColor = retStr;
          state.originalBgColor = (state.originalBgColor || DEFAULT_LIGHT_BGCOLOR).split('|')
            .concat(match).join('|');
        } else if (isTextColor) {
          state.color = retStr;
          state.originalColor = match;
        }
        return retStr;
      }
      return match;
    });

    // 背景色转换且节点无自定义文字色：追加计算后的文字色（保证可读）
    let extraColor: string | null = null;
    if (isBgColor && changed && !hasInlineColor) {
      const parentTextColorStr = state.originalColor || DEFAULT_LIGHT_TEXTCOLOR;
      const parentTextColor = parseColor(parentTextColorStr);
      if (parentTextColor) {
        const ret = adjustTextBrightness(ctx, parentTextColor,
          parseColor(state.bgColor || newValue) as Color);
        extraColor = ret.toString();
      }
    }

    out.push([key, changed ? newValue : rawValue]);
    if (extraColor) out.push(['color', extraColor]);
  }

  return { cssKVList: out, state };
}
