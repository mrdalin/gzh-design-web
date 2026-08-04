// 轻量 Markdown -> HTML 转换器。
// 仅覆盖 htmlToMarkdown 产出的语法范围（标题/列表/引用/加粗/斜体/删除线/行内代码/
// 链接/图片/代码块/段落），并对内联 <u> 原样保留以保证「富文本 ↔ Markdown」往返一致。
// 不引入第三方库，保持依赖精简。

function inlineMd(text: string): string {
  // 图片 ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // 加粗 **x**
  text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  // 斜体 *x*
  text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  // 删除线 ~~x~~
  text = text.replace(/~~([^~]+?)~~/g, '<s>$1</s>');
  // 行内代码 `x`
  text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');
  // 下划线 <u> 原样保留
  return text;
}

export function markdownToHtml(md: string): string {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeBuf = [];
        i++;
        continue;
      }
      inCode = false;
      out.push('<pre><code>' + codeBuf.join('\n') + '</code></pre>');
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    // 分隔线
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      out.push('<hr>');
      i++;
      continue;
    }
    // 引用
    if (line.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push('<blockquote>' + inlineMd(buf.join('<br>')) + '</blockquote>');
      continue;
    }
    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        buf.push('<li>' + inlineMd(lines[i].replace(/^[-*+]\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ul>' + buf.join('') + '</ul>');
      continue;
    }
    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push('<li>' + inlineMd(lines[i].replace(/^\d+\.\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ol>' + buf.join('') + '</ol>');
      continue;
    }
    // 段落：收集连续普通行
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>\s*|---|\*\*\*|```|[-*+]\s|\d+\.\s)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push('<p>' + inlineMd(para.join('<br>')) + '</p>');
  }

  return out.join('\n');
}
