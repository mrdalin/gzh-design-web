"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var validate_exports = {};
__export(validate_exports, {
  validate: () => validate
});
module.exports = __toCommonJS(validate_exports);
const FORBIDDEN = [
  [/\*\*[^*]+\*\*/, "\u68C0\u6D4B\u5230 Markdown \u7C97\u4F53\u8BED\u6CD5\u6B8B\u7559\uFF08**...**\uFF09\uFF0C\u5E94\u8F6C\u4E3A <strong>"],
  [/<style[\s>]/i, "<style> \u6807\u7B7E\u4F1A\u88AB\u8FC7\u6EE4\uFF0C\u6837\u5F0F\u5FC5\u987B\u5185\u8054"],
  [/<script[\s>]/i, "<script> \u6807\u7B7E\u4F1A\u88AB\u8FC7\u6EE4"],
  [/<\/?div[\s>]/i, "<div> \u4F1A\u88AB\u6539\u5199\uFF0C\u8BF7\u7528 <section>"],
  [/<link[\s>]/i, "\u5916\u90E8 <link>\uFF08CSS/\u5B57\u4F53\uFF09\u4F1A\u88AB\u8FC7\u6EE4"],
  [/\sclass\s*=/i, "class \u5C5E\u6027\u4F1A\u88AB\u5265\u79BB\uFF0C\u8BF7\u7528\u5185\u8054 style"],
  [/\sid\s*=/i, "id \u5C5E\u6027\u4F1A\u88AB\u5265\u79BB"],
  [/position\s*:\s*(fixed|absolute|sticky)/i, "position fixed/absolute/sticky \u4E0D\u88AB\u652F\u6301"],
  [/float\s*:/i, "float \u4E0D\u88AB\u652F\u6301"],
  [/@media/i, "@media \u5A92\u4F53\u67E5\u8BE2\u4E0D\u88AB\u652F\u6301"],
  [/@keyframes/i, "@keyframes \u52A8\u753B\u4E0D\u88AB\u652F\u6301"],
  [/@import/i, "@import \u4E0D\u88AB\u652F\u6301"],
  [/display\s*:\s*grid/i, "display:grid \u4E0D\u88AB\u652F\u6301\uFF0C\u8BF7\u7528 flex"],
  [/var\s*\(\s*--/i, "CSS \u53D8\u91CF var(--x) \u4E0D\u88AB\u652F\u6301\uFF0C\u8BF7\u5199\u6B7B\u503C"],
  [/url\s*\(\s*['"]?https?:\/\/[^)]*\.(woff2?|ttf|otf|eot)/i, "\u5916\u90E8\u5B57\u4F53\u4E0D\u88AB\u652F\u6301"]
];
const CJK = /[一-鿿㐀-䶿]/;
const SKIP_TAGS = /* @__PURE__ */ new Set(["head", "title", "style", "script"]);
const HALF_PUNCT = /[一-鿿㐀-䶿][,;!?]/;
const ASCII_QUOTE = /["']/;
const CODE_STYLE = /monospace|white-space\s*:\s*pre|courier|consolas|sf\s*mono/i;
class LeafChecker {
  stack = [];
  leafDepth = 0;
  codeDepth = 0;
  spanLeafCount = 0;
  unwrapped = [];
  halfPunct = [];
  badLeaf = [];
  startTag(tag, attrs) {
    const isLeaf = tag === "span" && "leaf" in attrs;
    const style = attrs["style"] || "";
    const isCode = CODE_STYLE.test(style);
    if (isLeaf) {
      this.spanLeafCount++;
      this.leafDepth++;
      const leafVal = attrs["leaf"] || "";
      if (leafVal.trim()) this.badLeaf.push(leafVal.trim().length > 20 ? leafVal.trim().slice(0, 20) + "\u2026" : leafVal.trim());
    }
    if (isCode) this.codeDepth++;
    this.stack.push({ tag, isLeaf, isCode });
  }
  endTag(tag) {
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
  data(text) {
    const t = text.trim();
    if (!t || !CJK.test(t)) return;
    if (this.stack.some((s) => SKIP_TAGS.has(s.tag))) return;
    if (this.leafDepth === 0) {
      this.unwrapped.push(t.length > 24 ? t.slice(0, 24) + "\u2026" : t);
    }
    if (this.codeDepth === 0 && (HALF_PUNCT.test(t) || ASCII_QUOTE.test(t))) {
      this.halfPunct.push(t.length > 24 ? t.slice(0, 24) + "\u2026" : t);
    }
  }
}
function validate(html) {
  const errors = [];
  const warnings = [];
  for (const [rx, msg] of FORBIDDEN) {
    const hits = (html.match(rx) || []).length;
    if (hits) errors.push(`${msg}\uFF08\u547D\u4E2D ${hits} \u5904\uFF09`);
  }
  const checker = new LeafChecker();
  let last = 0;
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g;
  let m;
  const parseAttrs = (s) => {
    const out = {};
    const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|(\S+)))?/g;
    let am;
    while (am = re.exec(s)) {
      out[am[1].toLowerCase()] = am[3] ?? am[4] ?? am[5] ?? "";
    }
    return out;
  };
  while (m = tagRe.exec(html)) {
    const text = html.slice(last, m.index);
    if (text) checker.data(text);
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrs = parseAttrs(m[3]);
    if (closing) checker.endTag(tag);
    else {
      checker.startTag(tag, attrs);
      if (m[4] === "/") checker.endTag(tag);
    }
    last = m.index + m[0].length;
  }
  const tail = html.slice(last);
  if (tail) checker.data(tail);
  const hasCjk = CJK.test(html);
  if (hasCjk && checker.spanLeafCount === 0) {
    errors.push('\u5168\u6587\u6CA1\u6709\u4EFB\u4F55 <span leaf=""> \u5305\u88F9\u2014\u2014\u7C98\u8D34\u5230\u516C\u4F17\u53F7\u540E\u6837\u5F0F\u4F1A\u5927\u9762\u79EF\u4E22\u5931');
  } else if (checker.unwrapped.length) {
    warnings.push(
      `${checker.unwrapped.length} \u5904\u4E2D\u6587\u6587\u672C\u672A\u88AB <span leaf> \u5305\u88F9\uFF0C\u6837\u5F0F\u53EF\u80FD\u4E22\u5931\u3002\u4F8B\uFF1A${checker.unwrapped.slice(0, 5).map((s) => `\u300C${s}\u300D`).join("\uFF1B")}`
    );
  }
  if (checker.halfPunct.length) {
    warnings.push(
      `${checker.halfPunct.length} \u5904\u6B63\u6587\u7591\u4F3C\u534A\u89D2\u6807\u70B9/\u82F1\u6587\u5F15\u53F7\uFF0C\u5E94\u6539\u4E2D\u6587\u5168\u89D2\uFF08\u4EE3\u7801\u5757\u5185\u4E0D\u8BA1\uFF09\u3002\u4F8B\uFF1A${checker.halfPunct.slice(0, 5).map((s) => `\u300C${s}\u300D`).join("\uFF1B")}`
    );
  }
  if (checker.badLeaf.length) {
    errors.push(
      `${checker.badLeaf.length} \u5904 <span leaf="..."> \u628A\u6587\u5B57\u5199\u8FDB\u4E86 leaf \u5C5E\u6027\uFF08\u5E94\u4E3A\u7A7A leaf="" \u4E14\u6587\u5B57\u5728\u6807\u7B7E\u4F53\u5185\uFF09\uFF0C\u4F1A\u5BFC\u81F4\u7C98\u8D34\u540E\u4E22\u5B57\u6216 HTML \u4E71\u7801\u3002\u4F8B\uFF1A${checker.badLeaf.slice(0, 5).map((s) => `\u300C${s}\u300D`).join("\uFF1B")}`
    );
  }
  return { errors, warnings, leafCount: checker.spanLeafCount };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validate
});
