function stripCodeFence(value) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function nextNonWhitespace(value, start) {
  for (let index = start; index < value.length; index += 1) {
    if (!/\s/.test(value[index])) return value[index];
  }
  return "";
}

function looksLikeJsonTokenAfterComma(value, start, objectKeyOnly = false) {
  let tokenIndex = start;
  while (tokenIndex < value.length && /\s/.test(value[tokenIndex])) tokenIndex += 1;
  const token = value[tokenIndex] || "";

  if (token !== '"') {
    if (objectKeyOnly) return token === "}";
    return (
      token === "{" ||
      token === "[" ||
      token === "]" ||
      token === "}" ||
      /^[-0-9tfn]$/.test(token)
    );
  }
  if (!objectKeyOnly && value[tokenIndex + 1] === '"') return true;

  let escaping = false;
  for (let index = tokenIndex + 1; index < value.length; index += 1) {
    const character = value[index];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (character === "\\") {
      escaping = true;
      continue;
    }
    if (character === '"') {
      const afterQuotedToken = nextNonWhitespace(value, index + 1);
      if (objectKeyOnly) return afterQuotedToken === ":";
      return (
        afterQuotedToken === ":" ||
        afterQuotedToken === "," ||
        afterQuotedToken === "]" ||
        afterQuotedToken === "}"
      );
    }
  }

  return false;
}

function isLikelyClosingQuote(value, quoteIndex, stringRole) {
  let followingIndex = quoteIndex + 1;
  while (followingIndex < value.length && /\s/.test(value[followingIndex])) {
    followingIndex += 1;
  }

  const following = value[followingIndex] || "";
  if (following === ":" || following === "}" || following === "]" || !following) {
    return true;
  }
  if (following !== ",") return false;

  return looksLikeJsonTokenAfterComma(
    value,
    followingIndex + 1,
    stringRole === "objectValue",
  );
}

function repairJsonStrings(value) {
  const normalized = value.replace(/^\uFEFF/, "");
  let repaired = "";
  let inString = false;
  let escaping = false;
  let stringRole = "unknown";
  const containers = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];

    if (!inString) {
      const outsideCharacter = character === "\u00A0" ? " " : character;
      const currentContainer = containers.at(-1);

      if (outsideCharacter === '"') {
        if (currentContainer?.type === "object") {
          stringRole = currentContainer.expectingKey ? "key" : "objectValue";
        } else if (currentContainer?.type === "array") {
          stringRole = "arrayValue";
        } else {
          stringRole = "unknown";
        }
        inString = true;
      } else if (outsideCharacter === "{") {
        containers.push({ type: "object", expectingKey: true });
      } else if (outsideCharacter === "[") {
        containers.push({ type: "array" });
      } else if (outsideCharacter === "}" || outsideCharacter === "]") {
        containers.pop();
      } else if (outsideCharacter === ":" && currentContainer?.type === "object") {
        currentContainer.expectingKey = false;
      } else if (outsideCharacter === "," && currentContainer?.type === "object") {
        currentContainer.expectingKey = true;
      }

      repaired += outsideCharacter;
      continue;
    }

    if (escaping) {
      repaired += character;
      escaping = false;
      continue;
    }
    if (character === "\\") {
      repaired += character;
      escaping = true;
      continue;
    }
    if (character === "\n") {
      repaired += "\\n";
      continue;
    }
    if (character === "\r") {
      if (normalized[index + 1] === "\n") index += 1;
      repaired += "\\n";
      continue;
    }
    if (character === "\t") {
      repaired += "\\t";
      continue;
    }
    if (character === '"') {
      if (isLikelyClosingQuote(normalized, index, stringRole)) {
        repaired += character;
        inString = false;
      } else {
        repaired += '\\"';
      }
      continue;
    }

    repaired += character;
  }

  return repaired;
}

function removeTrailingCommas(value) {
  let repaired = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      repaired += character;
      if (escaping) escaping = false;
      else if (character === "\\") escaping = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      repaired += character;
      continue;
    }
    if (character === ",") {
      const following = nextNonWhitespace(value, index + 1);
      if (following === "}" || following === "]") continue;
    }
    repaired += character;
  }

  return repaired;
}

function repairJson(value) {
  return removeTrailingCommas(repairJsonStrings(value));
}

function parseJsonObject(value) {
  const cleaned = stripCodeFence(value);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const extracted = start === -1 || end <= start ? "" : cleaned.slice(start, end + 1);
  const candidates = [cleaned, extracted].filter(Boolean);
  let parseError;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      parseError = error;
    }
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(repairJson(candidate));
    } catch (error) {
      parseError = error;
    }
  }

  throw parseError;
}

function plainSubtitleCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replaceAll("**", "")
    .replaceAll("__", "")
    .trim();
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
      ? [...new Set(result.subtitleCandidates
          .filter((candidate) => typeof candidate === "string")
          .map(plainSubtitleCandidate)
          .filter((candidate) => candidate && revised.includes(candidate)))]
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
