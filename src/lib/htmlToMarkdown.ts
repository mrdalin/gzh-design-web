function escapeMd(text: string): string {
  return text.replace(/([*_`\[\]\\])/g, '\\$1');
}

function innerText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  return Array.from(el.childNodes).map(innerText).join('');
}

function convertNode(node: Node, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\s+/g, ' ');
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes);

    switch (tag) {
      case 'p':
        return '\n\n' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'br':
        return '\n';
      case 'h1':
        return '\n\n# ' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'h2':
        return '\n\n## ' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'h3':
        return '\n\n### ' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'h4':
        return '\n\n#### ' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'h5':
        return '\n\n##### ' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'h6':
        return '\n\n###### ' + children.map((c) => convertInline(c)).join('').trim() + '\n\n';
      case 'b':
      case 'strong':
        return '**' + children.map((c) => convertInline(c)).join('').trim() + '**';
      case 'i':
      case 'em':
        return '*' + children.map((c) => convertInline(c)).join('').trim() + '*';
      case 'u':
        return '<u>' + children.map((c) => convertInline(c)).join('').trim() + '</u>';
      case 's':
      case 'strike':
      case 'del':
        return '~~' + children.map((c) => convertInline(c)).join('').trim() + '~~';
      case 'a': {
        const href = el.getAttribute('href') || '';
        const text = children.map((c) => convertInline(c)).join('').trim();
        return '[' + text + '](' + href + ')';
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return '![' + alt + '](' + src + ')';
      }
      case 'ul': {
        const items = children
          .filter((c) => (c as HTMLElement).tagName?.toLowerCase() === 'li')
          .map((li) => '- ' + convertListItem(li as HTMLElement, listDepth + 1));
        return '\n\n' + items.join('\n') + '\n\n';
      }
      case 'ol': {
        let idx = 1;
        const items = children
          .filter((c) => (c as HTMLElement).tagName?.toLowerCase() === 'li')
          .map((li) => `${idx++}. ` + convertListItem(li as HTMLElement, listDepth + 1));
        return '\n\n' + items.join('\n') + '\n\n';
      }
      case 'blockquote':
        return (
          '\n\n' +
          children
            .map((c) => convertNode(c))
            .join('')
            .split('\n')
            .filter((l) => l.trim() !== '')
            .map((l) => '> ' + l)
            .join('\n') +
          '\n\n'
        );
      case 'div':
      case 'span':
      default:
        return children.map((c) => convertNode(c)).join('');
    }
  }
  return '';
}

function convertInline(node: Node): string {
  return convertNode(node);
}

function convertListItem(li: HTMLElement, depth: number): string {
  return Array.from(li.childNodes)
    .map((c) => {
      const tag = (c as HTMLElement).tagName?.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        // nested list indent
        return '\n' + convertNode(c, depth).trim().split('\n').map((l) => '  ' + l).join('\n');
      }
      return convertNode(c);
    })
    .join('')
    .replace(/\n\n+/g, ' ')
    .trim();
}

export function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const out = Array.from(doc.body.childNodes)
    .map((c) => convertNode(c))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}
