import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STUDIO_COOKIE, verifyStudioSession } from "../../../../lib/studio-auth";

const schema = {
  type: "object",
  properties: {
    revisedText: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          proposed: { type: "string" },
          reason: { type: "string" },
        },
        required: ["original", "proposed", "reason"],
        additionalProperties: false,
      },
    },
    subtitleCandidates: {
      type: "array",
      items: { type: "string" },
    },
    suggestedTopic: { type: "string" },
    suggestedSlug: { type: "string" },
  },
  required: [
    "revisedText",
    "suggestions",
    "subtitleCandidates",
    "suggestedTopic",
    "suggestedSlug",
  ],
  additionalProperties: false,
};

export async function POST(request) {
  const cookieStore = await cookies();
  if (!verifyStudioSession(cookieStore.get(STUDIO_COOKIE)?.value)) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { title, original } = await request.json().catch(() => ({}));
  if (!title?.trim() || !original?.trim()) {
    return NextResponse.json(
      { error: "제목과 원문을 모두 입력해 주세요." },
      { status: 400 },
    );
  }
  if (original.length > 30000) {
    return NextResponse.json({ error: "원문은 30,000자 이하여야 합니다." }, { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content:
            "당신은 김준경의 개인 아카이브를 돕는 한국어 편집자다. 원문의 관점, 문장 감각, 개인적인 어휘, 리듬, 분량과 주장을 우선 보존한다. 명백한 맞춤법 오류, 어색한 호응, 불필요한 반복만 최소한으로 다듬는다. 새로운 주장, 사례, 비유, 감정, 결론을 추가하지 않는다. 원문의 개성을 표준적인 모범 문장으로 평준화하지 않는다. revisedText에는 제한적으로 윤문한 완성 후보만 넣는다. suggestions에는 실제로 가치가 있는 수정만 짧고 구체적으로 설명한다. subtitleCandidates는 revisedText에 정확히 존재하는 핵심 문장만 최대 3개 고른다. suggestedSlug는 짧은 영문 kebab-case로 쓴다. 결과는 한국어로 작성한다.",
        },
        {
          role: "user",
          content: `제목: ${title.trim()}\n\n원문:\n${original.trim()}`,
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "editorial_suggestion",
          schema,
          strict: true,
        },
      },
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: result.error?.message || "윤문 제안을 만들지 못했습니다." },
      { status: response.status },
    );
  }

  try {
    const outputText =
      result.output_text ||
      result.output
        ?.flatMap((item) => item.content || [])
        .find((item) => item.type === "output_text")?.text;
    const proposal = JSON.parse(outputText);
    proposal.subtitleCandidates = proposal.subtitleCandidates.filter((candidate) =>
      proposal.revisedText.includes(candidate),
    );
    return NextResponse.json(proposal);
  } catch {
    return NextResponse.json(
      { error: "윤문 결과의 형식을 확인하지 못했습니다. 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
