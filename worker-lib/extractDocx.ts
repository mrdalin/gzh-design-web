// TypeScript 移植自 gzh-design/scripts/extract_docx.py（零外部依赖，仅用 jszip 解包）
// Word .docx → Markdown。best-effort：覆盖标题/粗体/下划线/列表/图片/表格常见结构。

import JSZip from 'jszip';

export interface DocxExtract {
  markdown: string;
  imageCount: number;
}

function matchAll(s: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = g.exec(s))) out.push(m[0]);
  return out;
}
function attr(s: string, name: string): string {
  const m = s.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : '';
}
function innerText(block: string): string {
  // 取所有 <w:t> 文本并拼接
  return (block.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
    .map((t) => (t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')))
    .join('');
}

export async function extractDocx(buffer: ArrayBuffer): Promise<DocxExtract> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { markdown: '', imageCount: 0 };
  }
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) return { markdown: '', imageCount: 0 };

  const stylesXml = (await zip.file('word/styles.xml')?.async('string')) || '';
  const relsXml = (await zip.file('word/_rels/document.xml.rels')?.async('string')) || '';

  // styleId -> 标题级别
  const headingOf: Record<string, number> = {};
  for (const st of matchAll(stylesXml, /<w:style[\s\S]*?<\/w:style>/g)) {
    const sid = attr(st, 'w:styleId');
    const nameVal = attr(st, 'w:val');
    if (!sid) continue;
    const m = nameVal.match(/(?:heading|标题)\s*([1-6])/i) || nameVal.match(/^([1-6])$/);
    if (m) headingOf[sid] = parseInt(m[1], 10);
  }

  // rId -> 媒体路径
  const mediaOf: Record<string, string> = {};
  for (const rel of matchAll(relsXml, /<Relationship[\s\S]*?>/g)) {
    const id = attr(rel, 'Id');
    const target = attr(rel, 'Target');
    if (id && /media\//.test(target)) mediaOf[id] = 'word/' + target.replace(/^\//, '').replace(/\.\.\//g, '');
  }

  const body = docXml.match(/<w:body[\s\S]*?<\/w:body>/);
  const bodyXml = body ? body[0] : docXml;

  const lines: string[] = [];
  let imgN = 0;

  const blocks = matchAll(bodyXml, /<w:(p|tbl)[\s\S]*?(?:<\/w:\1>|$)/g);
  for (const block of blocks) {
    const kind = block.startsWith('<w:p') ? 'p' : 'tbl';
    if (kind === 'tbl') {
      const rows = matchAll(block, /<w:tr[\s\S]*?<\/w:tr>/g).map((tr) =>
        (tr.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [])
          .map((tc) => innerText(tc).trim().replace(/\|/g, '\\|') || ' ')
      );
      if (rows.length) {
        const ncols = rows[0].length;
        lines.push(rows[0].map((c) => `| ${c} `).join('') + '|');
        lines.push('|' + ' --- |'.repeat(ncols));
        rows.slice(1).forEach((r) => lines.push(r.map((c) => `| ${c} `).join('') + '|'));
        lines.push('');
      }
      continue;
    }

    // 段落内图片
    for (const blip of matchAll(block, /<a:blip[^>]*>/g)) {
      const rid = attr(blip, 'r:embed');
      if (mediaOf[rid]) {
        imgN++;
        lines.push(`![图片 ${imgN}](docx-image-${imgN})`);
        lines.push('');
      }
    }

    // 段落文本（含粗体/下划线 run）
    let text = '';
    for (const r of matchAll(block, /<w:r[\s\S]*?<\/w:r>/g)) {
      const rpr = r.match(/<w:rPr[\s\S]*?<\/w:rPr>/);
      const bold = !!rpr && /<w:b\b/.test(rpr[0]) && !/<w:b\s+w:val="(?:0|false)"/.test(rpr[0]);
      const ul = !!rpr && /<w:u\b/.test(rpr[0]);
      const t = innerText(r);
      if (!t) continue;
      let seg = t;
      if (bold) seg = `**${seg}**`;
      if (ul) seg = `<u>${seg}</u>`;
      text += seg;
    }
    text = text.replace(/\*\*\*\*/g, '').trim();
    if (!text) continue;

    const ppr = block.match(/<w:pPr[\s\S]*?<\/w:pPr>/);
    const sid = ppr ? attr(ppr[0], 'w:val') : '';
    const lvl = sid ? headingOf[sid] : undefined;
    const isList =
      !!ppr && /<w:numPr/.test(ppr[0]) || /list|列表/i.test(sid || '');

    if (lvl) {
      const clean = text.replace(/^\*\*(.*)\*\*$/, '$1');
      lines.push('#'.repeat(Math.min(lvl, 6)) + ' ' + clean);
    } else if (isList) {
      lines.push('- ' + text);
    } else {
      lines.push(text);
    }
    lines.push('');
  }

  return { markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n', imageCount: imgN };
}
