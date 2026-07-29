// 富文本复制：把公众号 HTML 以 text/html 写入剪贴板，
// 这样粘贴到公众号后台时能保留样式（普通 text/plain 会丢失版式）。

export async function copyRichText(html: string): Promise<void> {
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([html], { type: 'text/plain' });

  if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      return;
    } catch {
      // 落到下面的降级方案
    }
  }
  // 降级：用临时 textarea 复制纯文本（部分浏览器禁用富文本写入）
  const ta = document.createElement('textarea');
  ta.value = html;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
