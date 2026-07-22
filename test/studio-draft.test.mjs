import test from "node:test";
import assert from "node:assert/strict";
import {
  looksLikeStructuredResponse,
  parseEditorialResponse,
  validatePublishDraft,
} from "../lib/studio-draft.js";

const validResponse = {
  revisedText: "기다림 끝에 열매가 맺혔다.",
  suggestions: [
    { original: "열매 났다", proposed: "열매가 맺혔다", reason: "호응" },
  ],
  subtitleCandidates: ["기다림 끝에 열매가 맺혔다.", "본문에 없는 문장"],
  suggestedTopic: "기다림",
  suggestedSlug: "Waiting-For-Fruit",
};

const completeDraft = {
  title: "열매를 기다리며",
  original: "원문",
  revised: "기다림 끝에 열매가 맺혔다.",
  subtitle: "기다림 끝에 열매가 맺혔다.",
  topic: "기다림",
  slug: "waiting-for-fruit",
  publishedAt: "2026-07-22",
};

test("parses a valid editorial JSON response", () => {
  const result = parseEditorialResponse(JSON.stringify(validResponse));
  assert.equal(result.revised, validResponse.revisedText);
  assert.equal(result.slug, "waiting-for-fruit");
});

test("parses JSON inside a markdown code fence", () => {
  const result = parseEditorialResponse(`\`\`\`json\n${JSON.stringify(validResponse)}\n\`\`\``);
  assert.equal(result.topic, "기다림");
});

test("extracts JSON surrounded by explanatory text", () => {
  const result = parseEditorialResponse(`아래는 결과입니다.\n${JSON.stringify(validResponse)}\n확인해 주세요.`);
  assert.equal(result.revised, validResponse.revisedText);
});

test("keeps only subtitle candidates found in the revised text", () => {
  const result = parseEditorialResponse(JSON.stringify(validResponse));
  assert.deepEqual(result.subtitleCandidates, ["기다림 끝에 열매가 맺혔다."]);
});

test("rejects structured JSON without revisedText", () => {
  assert.throws(() => parseEditorialResponse('{"suggestedSlug":"only-slug"}'), /윤문본/);
});

test("detects a malformed structured response", () => {
  assert.equal(looksLikeStructuredResponse('{"revisedText": "unfinished"'), true);
  assert.equal(looksLikeStructuredResponse("일반 텍스트 윤문본"), false);
});

test("lists missing publication fields", () => {
  const error = validatePublishDraft({ ...completeDraft, topic: "", slug: "" });
  assert.match(error, /주제/);
  assert.match(error, /슬러그/);
});

test("accepts a complete valid publication draft", () => {
  assert.equal(validatePublishDraft(completeDraft), "");
});

test("accepts a manually written subtitle that is not copied from the body", () => {
  const draft = { ...completeDraft, subtitle: "내가 직접 정한 부제목" };
  assert.equal(validatePublishDraft(draft), "");
});
