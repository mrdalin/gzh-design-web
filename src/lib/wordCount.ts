// 字数统计：以「汉字标准」计数——
// 每个 CJK 汉字计 1 字（绝不按「一个汉字 = 2 字节」统计）；
// 连续的英文/数字按「词」计 1 字；空白与 HTML 标签不计入。

const CJK =
  /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/g;

/** 去掉 HTML 标签，仅保留可见文本用于计数 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

/**
 * 统计「字数」。
 * - CJK 汉字：逐字计 1
 * - 非 CJK 的连续字母/数字：按「词」计 1（如 hello 计 1）
 * - 标点、空白、HTML 标签：不计
 */
export function countWords(input: string): number {
  if (!input) return 0;
  const text = stripHtml(input).replace(/\s+/g, '');
  if (!text) return 0;

  const cjkCount = (text.match(CJK) || []).length;
  const nonCjk = text.replace(CJK, ' ');
  const wordCount = (nonCjk.match(/[A-Za-z0-9]+/g) || []).length;

  return cjkCount + wordCount;
}
