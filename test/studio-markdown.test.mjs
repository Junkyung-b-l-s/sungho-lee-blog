import test from "node:test";
import assert from "node:assert/strict";
import { applyMarkdownFormat, insertMarkdownImage } from "../lib/studio-markdown.js";

test("bold wraps the selected text and keeps it selected", () => {
  const result = applyMarkdownFormat({
    value: "이 문장은 중요하다",
    start: 2,
    end: 5,
    format: "bold",
  });

  assert.equal(result.value, "이 **문장은** 중요하다");
  assert.deepEqual([result.selectionStart, result.selectionEnd], [4, 7]);
});

test("quote prefixes every selected line", () => {
  const result = applyMarkdownFormat({
    value: "첫 문장\n둘째 문장",
    start: 0,
    end: 10,
    format: "quote",
  });

  assert.equal(result.value, "> 첫 문장\n> 둘째 문장");

  const mixed = applyMarkdownFormat({
    value: "> 이미 인용\n새 인용",
    start: 0,
    end: 12,
    format: "quote",
  });
  assert.equal(mixed.value, "이미 인용\n> 새 인용");
});

test("heading and list operate on complete selected lines", () => {
  const heading = applyMarkdownFormat({
    value: "앞 문장\n소제목\n뒤 문장",
    start: 5,
    end: 8,
    format: "heading",
  });
  assert.equal(heading.value, "앞 문장\n## 소제목\n뒤 문장");

  const list = applyMarkdownFormat({
    value: "하나\n둘",
    start: 0,
    end: 4,
    format: "list",
  });
  assert.equal(list.value, "- 하나\n- 둘");
});

test("link inserts an editable safe URL around the selection", () => {
  const result = applyMarkdownFormat({
    value: "관련 글 읽기",
    start: 0,
    end: 4,
    format: "link",
  });

  assert.equal(result.value, "[관련 글](https://) 읽기");
  assert.equal(
    result.value.slice(result.selectionStart, result.selectionEnd),
    "https://",
  );
});

test("image insertion never deletes selected prose", () => {
  const result = insertMarkdownImage({
    value: "중요한 문장",
    start: 0,
    end: 6,
    url: "/media/posts/test.webp",
    alt: "설명",
  });

  assert.match(result.value, /^중요한 문장\n\n!\[설명\]/);
});

test("collapsed-caret image insertion never splits a word", () => {
  const result = insertMarkdownImage({
    value: "문장 중간\n다음 문장",
    start: 2,
    end: 2,
    url: "/media/posts/test.webp",
    alt: "설명",
  });

  assert.equal(result.value, "문장 중간\n\n![설명](/media/posts/test.webp)\n\n다음 문장");
});

test("image markdown is inserted on its own line with escaped labels", () => {
  const result = insertMarkdownImage({
    value: "앞 문장\n뒤 문장",
    start: 5,
    end: 5,
    url: "/media/2026-08-24/need.webp",
    alt: "필요 [흐름]",
    caption: '나의 "렌즈"',
  });

  assert.equal(
    result.value,
    '앞 문장\n\n![필요 \\[흐름\\]](/media/2026-08-24/need.webp "나의 \\"렌즈\\"")\n\n뒤 문장',
  );
  assert.equal(result.selectionStart, result.selectionEnd);
});
