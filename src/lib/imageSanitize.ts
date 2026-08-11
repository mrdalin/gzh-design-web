// Word/粘贴图片占位与清洗工具。
// 统一放在这里，避免 App.tsx 与 RichEditor.tsx 重复实现或循环依赖。

// 占位文案：富文本灰块、Markdown 占位符、Toast 提示共用。
export const PLACEHOLDER_MESSAGE =
  '图片占位。请在右上角配置「图片 API」后重传 Word 以自动上传图片';

// 响应式 SVG 占位图：宽度 100% 随编辑器自适应，文字拆成 3 行避免被裁。
// 注意：SVG 被当作 <img> 加载，所以文字是「画」出来的，不是可选中文字。
export const PLACEHOLDER_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="160" viewBox="0 0 640 160" preserveAspectRatio="xMidYMid meet">
<rect width="100%" height="100%" fill="#f0f0f0"/>
<text x="50%" y="52" text-anchor="middle" font-family="-apple-system,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif" font-size="20" fill="#999">
<tspan x="50%" dy="0">图片占位。</tspan>
<tspan x="50%" dy="28">请在右上角配置「图片 API」</tspan>
<tspan x="50%" dy="28">后重传 Word 以自动上传图片</tspan>
</text>
</svg>`
  );

// 兜底：把 Markdown 里残留的 data:image base64 图片统一替换成干净占位符。
export function sanitizeMdImages(md: string): string {
  let idx = 0;
  return md.replace(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g, () => {
    idx++;
    return `![图片 ${idx} 占位：${PLACEHOLDER_MESSAGE}](#pending)`;
  });
}

// 把富文本 HTML 中仍未替换的 data:image 图片统一换成 #pending 占位并写入占位文案，
// 避免 htmlToMarkdown 后再现 base64 长串；已成功替换为真实 URL 的图不受影响。
export function sanitizeHtmlImages(html: string): string {
  let idx = 0;
  return html.replace(
    /<img\b[^>]*\bsrc=(["'])data:image\/[^"']*\1[^>]*>/gi,
    () => {
      idx++;
      const alt = PLACEHOLDER_MESSAGE.replace('图片占位', `图片 ${idx} 占位`);
      return `<img src="#pending" alt="${alt.replace(/"/g, '&quot;')}">`;
    }
  );
}

// 图片 alt 清洗：Word/mammoth 会带出原始本地路径或文件名（如 C:\Users\...\效果图3.jpg），
// 统一只保留最后一段文件名并去掉扩展名（非路径的说明文字原样保留）；空 alt 给默认「图片」。
export function cleanImageAlt(alt: string | undefined | null): string {
  const a = (alt || '').trim();
  if (!a) return '图片';
  // 取路径最后一段（兼容 / 与 \）
  const seg = a.split(/[\\/]/).pop() || a;
  // 去掉图片扩展名；若去掉后为空（如 alt 本身就是 ".png"）则保留原样
  const cleaned = seg.replace(/\.(png|jpe?g|gif|bmp|webp|svg|ico|avif)$/i, '').trim();
  return cleaned || a;
}
