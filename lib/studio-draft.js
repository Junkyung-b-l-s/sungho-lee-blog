function stripCodeFence(value) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseJsonObject(value) {
  const cleaned = stripCodeFence(value);

  try {
    return JSON.parse(cleaned);
  } catch (directError) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw directError;
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export function parseEditorialResponse(value) {
  const result = parseJsonObject(value);

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("윤문 답변이 JSON 객체가 아닙니다.");
  }
  if (typeof result.revisedText !== "string" || !result.revisedText.trim()) {
    throw new Error("윤문본을 찾지 못했습니다.");
  }

  const revised = result.revisedText.trim();
  return {
    revised,
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions.filter(
          (item) => item?.original && item?.proposed && item?.reason,
        )
      : [],
    subtitleCandidates: Array.isArray(result.subtitleCandidates)
      ? result.subtitleCandidates.filter(
          (candidate) =>
            typeof candidate === "string" && revised.includes(candidate),
        )
      : [],
    topic:
      typeof result.suggestedTopic === "string"
        ? result.suggestedTopic.trim()
        : "",
    slug:
      typeof result.suggestedSlug === "string"
        ? result.suggestedSlug.trim().toLowerCase()
        : "",
  };
}

export function looksLikeStructuredResponse(value) {
  const cleaned = stripCodeFence(value);
  return (
    cleaned.startsWith("{") ||
    cleaned.startsWith("[") ||
    /"(?:revisedText|suggestions|subtitleCandidates|suggestedTopic|suggestedSlug)"\s*:/.test(
      cleaned,
    )
  );
}

const REQUIRED_FIELDS = [
  ["title", "제목"],
  ["original", "원문"],
  ["revised", "승인본"],
  ["topic", "주제"],
  ["publishedAt", "발행일"],
  ["slug", "슬러그"],
  ["subtitle", "핵심 문장"],
];

export function validatePublishDraft(draft) {
  const missing = REQUIRED_FIELDS.filter(
    ([field]) => typeof draft[field] !== "string" || !draft[field].trim(),
  ).map(([, label]) => label);

  if (missing.length) {
    return `${missing.join(", ")}을(를) 입력해 주세요.`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim())) {
    return "슬러그는 영문 소문자, 숫자와 하이픈만 사용할 수 있습니다.";
  }
  return "";
}
