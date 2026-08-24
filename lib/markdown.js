import { marked, Renderer } from "marked";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeUrl(value, { image = false } = {}) {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (/^https:\/\//i.test(value)) return true;
  return !image && (/^http:\/\//i.test(value) || /^mailto:/i.test(value));
}

const renderer = new Renderer();

renderer.html = ({ text }) => escapeHtml(text);
renderer.paragraph = function paragraph({ tokens }) {
  if (tokens.length === 1 && tokens[0].type === "image") {
    return this.parser.parseInline(tokens);
  }
  return `<p>${this.parser.parseInline(tokens)}</p>\n`;
};
renderer.link = function link({ href, title, tokens }) {
  const label = this.parser.parseInline(tokens);
  if (!isSafeUrl(href)) return label;
  const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
  const external = /^https?:\/\//i.test(href)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  return `<a href="${escapeHtml(href)}"${titleAttribute}${external}>${label}</a>`;
};
renderer.image = ({ href, title, text }) => {
  if (!isSafeUrl(href, { image: true })) return escapeHtml(text);
  const alt = escapeHtml(text);
  const caption = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : "";
  return `<figure><img src="${escapeHtml(href)}" alt="${alt}" loading="lazy" decoding="async">${caption}</figure>`;
};

export function renderMarkdown(markdown) {
  return marked.parse(String(markdown || ""), {
    breaks: true,
    gfm: true,
    renderer,
  });
}
