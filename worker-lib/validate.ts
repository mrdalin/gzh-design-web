// TypeScript 移植自 gzh-design/scripts/validate_gzh_html.py
// 公众号 HTML 合规校验：平台禁用项 + <span leaf> 包裹检查。

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  leafCount: number;
}

const FORBIDDEN: [RegExp, string][] = [
  [/<style[\s>]/i, '<style> 标签会被过滤，样式必须内联'],
  [/<script[\s>]/i, '<script> 标签会被过滤'],
  [/<\/?div[\s>]/i, '<div> 会被改写，请用 <section>'],
  [/<link[\s>]/i, '外部 <link>（CSS/字体）会被过滤'],
  [/\sclass\s*=/i, 'class 属性会被剥离，请用内联 style'],
  [/\sid\s*=/i, 'id 属性会被剥离'],
  [/position\s*:\s*(fixed|absolute|sticky)/i, 'position fixed/absolute/sticky 不被支持'],
  [/float\s*:/i, 'float 不被支持'],
  [/@media/i, '@media 媒体查询不被支持'],
  [/@keyframes/i, '@keyframes 动画不被支持'],
  [/@import/i, '@import 不被支持'],
  [/display\s*:\s*grid/i, 'display:grid 不被支持，请用 flex'],
  [/var\s*\(\s*--/i, 'CSS 变量 var(--x) 不被支持，请写死值'],
  [/url\s*\(\s*['"]?https?:\/\/[^)]*\.(woff2?|ttf|otf|eot)/i, '外部字体不被支持'],
];

const CJK = /[一-鿿㐀-䶿]/;
const SKIP_TAGS = new Set(['head', 'title', 'style', 'script']);
const HALF_PUNCT = /[一-鿿㐀-䶿][,;!?]/;
const ASCII_QUOTE = /["']/;
const CODE_STYLE = /monospace|white-space\s*:\s*pre|courier|consolas|sf\s*mono/i;

interface StackItem {
  tag: string;
  isLeaf: boolean;
  isCode: boolean;
}

class LeafChecker {
  stack: StackItem[] = [];
  leafDepth = 0;
  codeDepth = 0;
  spanLeafCount = 0;
  unwrapped: string[] = [];
  halfPunct: string[] = [];
  badLeaf: string[] = [];

  startTag(tag: string, attrs: Record<string, string | null>) {
    const isLeaf = tag === 'span' && 'leaf' in attrs;
    const style = attrs['style'] || '';
    const isCode = CODE_STYLE.test(style);
    if (isLeaf) {
      this.spanLeafCount++;
      this.leafDepth++;
      const leafVal = attrs['leaf'] || '';
      // leaf 应为空 ""；若属性值非空，说明文字被塞进了属性，会导致粘贴丢字/乱码
      if (leafVal.trim()) this.badLeaf.push(leafVal.trim().length > 20 ? leafVal.trim().slice(0, 20) + '…' : leafVal.trim());
    }
    if (isCode) this.codeDepth++;
    this.stack.push({ tag, isLeaf, isCode });
  }

  endTag(tag: string) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].tag === tag) {
        for (let j = i; j < this.stack.length; j++) {
          if (this.stack[j].isLeaf) this.leafDepth--;
          if (this.stack[j].isCode) this.codeDepth--;
        }
        this.stack.splice(i);
        break;
      }
    }
  }

  data(text: string) {
    const t = text.trim();
    if (!t || !CJK.test(t)) return;
    if (this.stack.some((s) => SKIP_TAGS.has(s.tag))) return;
    if (this.leafDepth === 0) {
      this.unwrapped.push(t.length > 24 ? t.slice(0, 24) + '…' : t);
    }
    if (this.codeDepth === 0 && (HALF_PUNCT.test(t) || ASCII_QUOTE.test(t))) {
      this.halfPunct.push(t.length > 24 ? t.slice(0, 24) + '…' : t);
    }
  }
}

// 极简 HTML 扫描器：在 <style>/<script> 等跳过标签内不把内容当正文。
export function validate(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [rx, msg] of FORBIDDEN) {
    const hits = (html.match(rx) || []).length;
    if (hits) errors.push(`${msg}（命中 ${hits} 处）`);
  }

  const checker = new LeafChecker();
  let last = 0;
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  const parseAttrs = (s: string): Record<string, string | null> => {
    const out: Record<string, string | null> = {};
    const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|(\S+)))?/g;
    let am: RegExpExecArray | null;
    while ((am = re.exec(s))) {
      out[am[1].toLowerCase()] = am[3] ?? am[4] ?? am[5] ?? '';
    }
    return out;
  };
  while ((m = tagRe.exec(html))) {
    const text = html.slice(last, m.index);
    if (text) checker.data(text);
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = parseAttrs(m[3]);
    if (closing) checker.endTag(tag);
    else {
      checker.startTag(tag, attrs);
      if (m[4] === '/') checker.endTag(tag);
    }
    last = m.index + m[0].length;
  }
  const tail = html.slice(last);
  if (tail) checker.data(tail);

  const hasCjk = CJK.test(html);
  if (hasCjk && checker.spanLeafCount === 0) {
    errors.push('全文没有任何 <span leaf=""> 包裹——粘贴到公众号后样式会大面积丢失');
  } else if (checker.unwrapped.length) {
    warnings.push(
      `${checker.unwrapped.length} 处中文文本未被 <span leaf> 包裹，样式可能丢失。例：${checker.unwrapped
        .slice(0, 5)
        .map((s) => `「${s}」`)
        .join('；')}`
    );
  }

  if (checker.halfPunct.length) {
    warnings.push(
      `${checker.halfPunct.length} 处正文疑似半角标点/英文引号，应改中文全角（代码块内不计）。例：${checker.halfPunct
        .slice(0, 5)
        .map((s) => `「${s}」`)
        .join('；')}`
    );
  }

  if (checker.badLeaf.length) {
    errors.push(
      `${checker.badLeaf.length} 处 <span leaf="..."> 把文字写进了 leaf 属性（应为空 leaf="" 且文字在标签体内），会导致粘贴后丢字或 HTML 乱码。例：${checker.badLeaf
        .slice(0, 5)
        .map((s) => `「${s}」`)
        .join('；')}`
    );
  }

  return { errors, warnings, leafCount: checker.spanLeafCount };
}
