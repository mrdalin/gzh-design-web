import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
});

// 清理 Word 粘贴常见的空段落和多余换行
turndown.addRule('emptyParagraph', {
  filter: (node) => {
    return node.nodeName === 'P' && (node.textContent || '').trim() === '';
  },
  replacement: () => '',
});

export function htmlToMarkdown(html: string): string {
  return turndown
    .turndown(html)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
