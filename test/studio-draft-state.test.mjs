import test from "node:test";
import assert from "node:assert/strict";
import { reconcileStoredDraft } from "../lib/studio-draft-state.js";

const emptyDraft = {
  title: "",
  original: "",
  revised: "",
  subtitle: "",
  topic: "",
  slug: "",
  publishedAt: "2026-08-26",
  sourceOriginalPath: "",
  sourcePublishedPath: "",
  stage: "write",
};

test("a deleted edit target becomes a new draft without losing writing", () => {
  const result = reconcileStoredDraft({
    emptyDraft,
    storedDraft: {
      title: "보존할 제목",
      original: "보존할 원문",
      revised: "보존할 윤문본",
      publishedAt: "2026-08-05",
      sourceOriginalPath: "content/originals/20260805_삭제됨.md",
      sourcePublishedPath: "content/published/20260805_삭제됨.md",
      stage: "publish",
    },
    publishedPosts: [],
    today: "2026-08-26",
  });

  assert.equal(result.staleEditCleared, true);
  assert.equal(result.draft.title, "보존할 제목");
  assert.equal(result.draft.original, "보존할 원문");
  assert.equal(result.draft.revised, "보존할 윤문본");
  assert.equal(result.draft.sourceOriginalPath, "");
  assert.equal(result.draft.sourcePublishedPath, "");
  assert.equal(result.draft.publishedAt, "2026-08-26");
});

test("an existing edit target preserves its original identity and date", () => {
  const storedDraft = {
    title: "기존 글",
    original: "원문",
    revised: "윤문본",
    publishedAt: "2026-08-05",
    sourceOriginalPath: "content/originals/20260805_기존.md",
    sourcePublishedPath: "content/published/20260805_기존.md",
  };
  const result = reconcileStoredDraft({
    emptyDraft,
    storedDraft,
    publishedPosts: [{ sourcePublishedPath: storedDraft.sourcePublishedPath }],
    today: "2026-08-26",
  });

  assert.equal(result.staleEditCleared, false);
  assert.equal(result.draft.sourcePublishedPath, storedDraft.sourcePublishedPath);
  assert.equal(result.draft.publishedAt, "2026-08-05");
});

test("a posts API failure never converts an edit into a duplicate new post", () => {
  const storedDraft = {
    title: "기존 글",
    original: "원문",
    sourceOriginalPath: "content/originals/20260805_기존.md",
    sourcePublishedPath: "content/published/20260805_기존.md",
    publishedAt: "2026-08-05",
  };
  const result = reconcileStoredDraft({
    emptyDraft,
    storedDraft,
    publishedPosts: null,
    today: "2026-08-26",
  });

  assert.equal(result.staleEditCleared, false);
  assert.equal(result.draft.sourcePublishedPath, storedDraft.sourcePublishedPath);
});

test("a blank stored draft always defaults to today", () => {
  const result = reconcileStoredDraft({
    emptyDraft,
    storedDraft: { publishedAt: "2026-08-05" },
    publishedPosts: [],
    today: "2026-08-26",
  });

  assert.equal(result.draft.publishedAt, "2026-08-26");
});

test("a substantive new draft preserves a date the writer selected", () => {
  const result = reconcileStoredDraft({
    emptyDraft,
    storedDraft: { title: "예약 글", original: "원문", publishedAt: "2026-09-01" },
    publishedPosts: [],
    today: "2026-08-26",
  });

  assert.equal(result.draft.publishedAt, "2026-09-01");
});
