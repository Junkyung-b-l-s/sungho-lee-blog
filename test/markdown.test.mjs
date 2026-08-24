import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../lib/markdown.js";

test("renders author formatting and intentional line breaks", () => {
  const html = renderMarkdown("**굵은 문장**\n\n> 인용문\n\n첫 줄\n둘째 줄");

  assert.match(html, /<strong>굵은 문장<\/strong>/);
  assert.match(html, /<blockquote>[\s\S]*인용문[\s\S]*<\/blockquote>/);
  assert.match(html, /첫 줄<br>\s*둘째 줄/);
});

test("renders local post images with alt text and optional captions", () => {
  const html = renderMarkdown(
    '![필요가 만들어지는 과정](/media/2026-08-24/need.webp "나라는 렌즈를 통과하는 경험")',
  );

  assert.match(html, /<figure>/);
  assert.match(html, /src="\/media\/2026-08-24\/need\.webp"/);
  assert.match(html, /alt="필요가 만들어지는 과정"/);
  assert.match(html, /<figcaption>나라는 렌즈를 통과하는 경험<\/figcaption>/);
  assert.doesNotMatch(html, /<p>\s*<figure>/);
  assert.doesNotMatch(html, /<\/figure>\s*<\/p>/);
});

test("blocks raw HTML and unsafe link or image protocols", () => {
  const html = renderMarkdown(
    '<script>alert(1)</script>\n\n[위험](javascript:alert(1))\n\n![위험](data:text/html;base64,abc)',
  );

  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /data:/i);
  assert.match(html, /&lt;script&gt;/);
});
