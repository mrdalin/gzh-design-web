import fs from 'fs';
// 重新生成精简版 MOYU_GREEN_SAMPLE：保留结构示意，省略中间重复章节，降低 token 消耗。
const path = fs.readFileSync('worker-lib/sampleLayouts.ts', 'utf8');

// 1) 取出当前模板字符串内部（已是转义后的内容）
const m = path.match(/=\s*`([\s\S]*?)`;/);
if (!m) { console.error('无法解析现有 sampleLayouts.ts'); process.exit(1); }
const escaped = m[1];

// 2) 反转义，得到原始 HTML
let raw = escaped
  .replace(/\\\$/g, '$')   // \$ -> $
  .replace(/\\`/g, '`')    // \` -> `
  .replace(/\\\\/g, '\\'); // \\ -> \

// 3) 精简：保留前 30% + 后 9%，中间用注释省略
const keepHead = Math.floor(raw.length * 0.30);
const keepTail = Math.floor(raw.length * 0.09);
const head = raw.slice(0, keepHead);
const tail = raw.slice(raw.length - keepTail);
const marker = '\n\n  <!-- 中间章节为重复结构，已省略以节省 token；上述 PART 目录 + 分章样式已足够模型学习结构 -->\n\n';
const trimmed = head + marker + tail;

// 4) 重新转义
const reEscaped = trimmed
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

const out = `// 摸鱼绿主题官方标准排版样例（few-shot 参考，精简版）
// 保留：封面 / 目录 / 分章结构（大号数字 + PART 标签 + 标题 + 英文副标）/ 正文样式 / 结语 / 署名 / 互动三连。
// 省略：中间重复的章节内容，仅用于降低输入 token 消耗（不影响风格学习）。
export const MOYU_GREEN_SAMPLE = \`${reEscaped}\`;
`;

fs.writeFileSync('worker-lib/sampleLayouts.ts', out);
console.log('written. raw sample chars:', raw.length, '-> trimmed chars:', trimmed.length, '-> escaped chars:', reEscaped.length);
