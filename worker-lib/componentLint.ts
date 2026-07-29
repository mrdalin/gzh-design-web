// TypeScript 移植自 gzh-design/scripts/component_lint.py
// 扫描主题组件库 markdown 里的 ```html 代码块，检查会导致排版问题的反模式。

export interface LintResult {
  errors: string[];
  warnings: string[];
}

const CHECKS: [RegExp, string][] = [
  [/white-space\s*:\s*pre/i, '用了 white-space:pre —— 会把 HTML 源码缩进/换行渲染成大左缩进+空行'],
  [/<\/?div[\s>]/i, '出现 <div>，应用 <section>'],
  [/\sclass\s*=/i, '出现 class 属性（会被公众号剥离）'],
  [/\sid\s*=/i, '出现 id 属性'],
  [/<\/?style[\s>]/i, '出现 <style> 标签'],
  [/position\s*:\s*(fixed|absolute|sticky)/i, 'position fixed/absolute/sticky 不被支持'],
  [/display\s*:\s*grid/i, 'display:grid 不被支持'],
  [/var\s*\(\s*--/i, '用了 CSS 变量 var(--x)'],
  [/@(media|keyframes|import)/i, '@media/@keyframes/@import 不被支持'],
];

const FOURSIDE_DASHED = /border\s*:\s*[^;{}]*dashed/i;
const CENTERED = /text-align\s*:\s*center/i;

// 对一段 markdown（主题组件库）做反模式检查。
export function lintThemeMarkdown(md: string): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  const add = (level: 'error' | 'warn', msg: string) => {
    if (!seen.has(msg)) {
      seen.add(msg);
      if (level === 'error') errors.push(msg);
      else warnings.push(msg);
    }
  };

  const re = /```html\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const html = m[1];
    for (const [rx, msg] of CHECKS) {
      if (rx.test(html)) add('error', msg);
    }
    if (FOURSIDE_DASHED.test(html) && !CENTERED.test(html)) {
      add('warn', '四周虚线框 border:…dashed（正文强调请用左竖条；仅居中的素材占位块可用 dashed）');
    }
  }

  return { errors, warnings };
}
