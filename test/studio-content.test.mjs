import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStudioPostFiles,
  editablePostFromSources,
  isSafeStudioContentPath,
} from "../lib/studio-content.js";

const draft = {
  title: "바뀐 제목",
  original: "처음 쓴 원문",
  revised: "수정한 승인본",
  subtitle: "직접 정한 부제목",
  topic: "생각",
  slug: "edited-post",
  publishedAt: "2026-07-22",
};

test("new publication creates dated original and published paths", () => {
  const result = buildStudioPostFiles(draft);
  assert.equal(result.originalPath, "content/originals/20260722_바뀐제목.md");
  assert.equal(result.publishedPath, "content/published/20260722_바뀐제목.md");
  assert.match(result.publishedContent, /subtitle: 직접 정한 부제목/);
});

test("editing preserves existing paths when title and date change", () => {
  const result = buildStudioPostFiles({
    ...draft,
    sourceOriginalPath: "content/originals/20260701_옛제목.md",
    sourcePublishedPath: "content/published/20260701_옛제목.md",
  });
  assert.equal(result.originalPath, "content/originals/20260701_옛제목.md");
  assert.equal(result.publishedPath, "content/published/20260701_옛제목.md");
  assert.match(result.publishedContent, /title: 바뀐 제목/);
  assert.match(result.publishedContent, /publishedAt: '?2026-07-22'?/);
});

test("editing never includes the preserved original in files to update", () => {
  const result = buildStudioPostFiles({
    ...draft,
    sourceOriginalPath: "content/originals/20260701_옛제목.md",
    sourcePublishedPath: "content/published/20260701_옛제목.md",
  });
  assert.deepEqual(result.files, [
    { path: result.publishedPath, content: result.publishedContent },
  ]);
});

test("only markdown files in Studio content directories are safe", () => {
  assert.equal(isSafeStudioContentPath("content/originals/post.md", "originals"), true);
  assert.equal(isSafeStudioContentPath("content/published/post.md", "published"), true);
  assert.equal(isSafeStudioContentPath("../app/page.jsx", "published"), false);
  assert.equal(isSafeStudioContentPath("content/published/post.txt", "published"), false);
});

test("published and original sources become an editable Studio draft", () => {
  const publishedSource = `---\ntitle: 기존 제목\nslug: old-post\nsubtitle: 기존 부제목\npublishedAt: 2026-07-01\nupdatedAt: 2026-07-01\ntopic: 기록\ntype: essay\nvisibility: public\noriginal: ../originals/20260701_기존제목.md\n---\n기존 승인본\n`;
  const result = editablePostFromSources({
    publishedPath: "content/published/20260701_기존제목.md",
    publishedSource,
    originalSource: "보존된 원문\n",
  });
  assert.equal(result.title, "기존 제목");
  assert.equal(result.revised, "기존 승인본");
  assert.equal(result.original, "보존된 원문");
  assert.equal(result.sourceOriginalPath, "content/originals/20260701_기존제목.md");
  assert.equal(result.sourcePublishedPath, "content/published/20260701_기존제목.md");
});
