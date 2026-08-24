function lineRange(value, start, end) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lookupEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = value.indexOf("\n", lookupEnd);
  return {
    lineStart,
    lineEnd: nextBreak === -1 ? value.length : nextBreak,
  };
}

function prefixSelectedLines({ value, start, end, prefix }) {
  const { lineStart, lineEnd } = lineRange(value, start, end);
  const selectedLines = value.slice(lineStart, lineEnd);
  const lines = selectedLines.split("\n");
  const replacement = lines
    .map((line) => {
      if (prefix === "## ") {
        if (line.startsWith(prefix)) return line.slice(prefix.length);
        if (/^#{1,6}\s/.test(line)) return line.replace(/^#{1,6}\s/, prefix);
      }
      return line.startsWith(prefix) ? line.slice(prefix.length) : `${prefix}${line}`;
    })
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  };
}

export function applyMarkdownFormat({ value, start, end, format }) {
  const source = String(value || "");
  const safeStart = Math.max(0, Math.min(start, source.length));
  const safeEnd = Math.max(safeStart, Math.min(end, source.length));

  if (format === "quote") {
    return prefixSelectedLines({ value: source, start: safeStart, end: safeEnd, prefix: "> " });
  }
  if (format === "heading") {
    return prefixSelectedLines({ value: source, start: safeStart, end: safeEnd, prefix: "## " });
  }
  if (format === "list") {
    return prefixSelectedLines({ value: source, start: safeStart, end: safeEnd, prefix: "- " });
  }

  const selected = source.slice(safeStart, safeEnd);
  if (format === "bold") {
    const label = selected || "굵은 문장";
    return {
      value: `${source.slice(0, safeStart)}**${label}**${source.slice(safeEnd)}`,
      selectionStart: safeStart + 2,
      selectionEnd: safeStart + 2 + label.length,
    };
  }
  if (format === "link") {
    const label = selected || "링크 문구";
    const insertion = `[${label}](https://)`;
    const urlStart = safeStart + label.length + 3;
    return {
      value: `${source.slice(0, safeStart)}${insertion}${source.slice(safeEnd)}`,
      selectionStart: urlStart,
      selectionEnd: urlStart + "https://".length,
    };
  }

  return { value: source, selectionStart: safeStart, selectionEnd: safeEnd };
}

function escapeAlt(value) {
  return String(value || "이미지").replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function escapeCaption(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function insertMarkdownImage({ value, start, end, url, alt, caption = "" }) {
  const source = String(value || "");
  const safeStart = Math.max(0, Math.min(start, source.length));
  const safeEnd = Math.max(safeStart, Math.min(end, source.length));
  const nextBreak = source.indexOf("\n", safeEnd);
  const atLineStart = safeEnd === 0 || source[safeEnd - 1] === "\n";
  const insertionPoint = safeEnd === safeStart && atLineStart
    ? safeEnd
    : nextBreak === -1 ? source.length : nextBreak;
  const title = caption ? ` "${escapeCaption(caption)}"` : "";
  const markdown = `![${escapeAlt(alt)}](${url}${title})`;
  const before = source.slice(0, insertionPoint).replace(/\n*$/, "");
  const after = source.slice(insertionPoint).replace(/^\n*/, "");
  const leading = before ? `${before}\n\n` : "";
  const trailing = after ? `\n\n${after}` : "";
  const imageStart = leading.length;

  const imageEnd = imageStart + markdown.length;
  return {
    value: `${leading}${markdown}${trailing}`,
    selectionStart: imageEnd,
    selectionEnd: imageEnd,
  };
}
