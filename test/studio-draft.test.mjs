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

test("repairs unescaped dialogue quotes in an otherwise structured response", () => {
  const malformed = String.raw`{
    "revisedText": ""도하는 바람반이야."\n\n"도하 애기야"",
    "suggestions": [
      {
        "original": "" 또하 바람반이야."",
        "proposed": ""또하 바람반이야."",
        "reason": "앞 공백 삭제"
      }
    ],
    "subtitleCandidates": [""도하는 바람반이야."", ""도하 애기야""],
    "suggestedTopic": "도하",
    "suggestedSlug": "doha-wind-class"
  }`;

  const result = parseEditorialResponse(malformed);
  assert.equal(result.revised, `"도하는 바람반이야."\n\n"도하 애기야"`);
  assert.deepEqual(result.subtitleCandidates, [
    `"도하는 바람반이야."`,
    `"도하 애기야"`,
  ]);
  assert.equal(result.suggestions[0].proposed, `"또하 바람반이야."`);
});

test("repairs non-breaking indentation, raw line breaks, and trailing commas", () => {
  const malformed = `{
\u00a0 "revisedText": "첫 줄
둘째 줄",
\u00a0 "suggestions": [],
\u00a0 "subtitleCandidates": ["둘째 줄",],
\u00a0 "suggestedTopic": "기록",
\u00a0 "suggestedSlug": "two-lines",
}`;

  const result = parseEditorialResponse(malformed);
  assert.equal(result.revised, "첫 줄\n둘째 줄");
  assert.deepEqual(result.subtitleCandidates, ["둘째 줄"]);
});

test("preserves a non-breaking space inside prose while repairing outer JSON", () => {
  const malformed = `{
    "revisedText": "도하\u00a0바람반",
    "suggestions": [],
    "subtitleCandidates": [],
    "suggestedTopic": "도하",
    "suggestedSlug": "doha",
  }`;

  const result = parseEditorialResponse(malformed);
  assert.equal(result.revised, "도하\u00a0바람반");
});

test("keeps a comma after an unescaped quote inside prose", () => {
  const malformed = String.raw`{
    "revisedText": "그는 "안녕", 그리고 웃었다.",
    "suggestions": [],
    "subtitleCandidates": [],
    "suggestedTopic": "기록",
    "suggestedSlug": "hello"
  }`;

  const result = parseEditorialResponse(malformed);
  assert.equal(result.revised, `그는 "안녕", 그리고 웃었다.`);
});

test("repairs consecutive quoted phrases separated by a comma", () => {
  const malformed = String.raw`{
    "revisedText": "그는 "사과", "배"라고 말했다.",
    "suggestions": [],
    "subtitleCandidates": [],
    "suggestedTopic": "기록",
    "suggestedSlug": "fruit"
  }`;

  const result = parseEditorialResponse(malformed);
  assert.equal(result.revised, `그는 "사과", "배"라고 말했다.`);
});

test("repairs a list of three unescaped quoted phrases", () => {
  const malformed = String.raw`{
    "revisedText": "그는 "사과", "배", "포도"를 골랐다.",
    "suggestions": [],
    "subtitleCandidates": [],
    "suggestedTopic": "기록",
    "suggestedSlug": "fruit-list"
  }`;

  const result = parseEditorialResponse(malformed);
  assert.equal(result.revised, `그는 "사과", "배", "포도"를 골랐다.`);
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
