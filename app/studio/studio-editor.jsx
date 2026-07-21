"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "junkyung-studio-draft-v1";

function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const emptyDraft = {
  title: "",
  original: "",
  revised: "",
  subtitle: "",
  topic: "",
  slug: "",
  publishedAt: todayInSeoul(),
  suggestions: [],
  subtitleCandidates: [],
  chatGptResponse: "",
  stage: "write",
};

function editorialPrompt(title, original) {
  return `당신은 김준경의 개인 아카이브를 돕는 한국어 편집자입니다.

목표:
- 원문의 관점, 문장 감각, 개인적인 어휘, 리듬, 분량과 주장을 우선 보존합니다.
- 명백한 맞춤법 오류, 어색한 호응, 불필요한 반복만 최소한으로 다듬습니다.
- 새로운 주장, 사례, 비유, 감정, 결론을 추가하지 않습니다.
- 원문의 개성을 표준적인 모범 문장으로 평준화하지 않습니다.
- 먼저 수정하면 좋을 부분을 판단하고, 제한적으로 윤문한 후보를 만듭니다.
- subtitleCandidates에는 revisedText에 정확히 존재하는 핵심 문장만 최대 3개 고릅니다.
- suggestedSlug는 짧은 영문 kebab-case로 작성합니다.

반드시 설명이나 마크다운 코드 펜스 없이 아래 JSON 형식만 출력하세요.
{
  "revisedText": "제한적으로 윤문한 전체 원고",
  "suggestions": [
    {
      "original": "원문의 해당 표현",
      "proposed": "제안 표현",
      "reason": "수정 이유"
    }
  ],
  "subtitleCandidates": ["승인본에 실제로 존재하는 핵심 문장"],
  "suggestedTopic": "간결한 주제",
  "suggestedSlug": "short-english-slug"
}

제목: ${title.trim()}

원문:
${original.trim()}`;
}

function parseEditorialResponse(value) {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const result = JSON.parse(cleaned);

  if (!result.revisedText || typeof result.revisedText !== "string") {
    throw new Error("윤문본을 찾지 못했습니다.");
  }

  return {
    revised: result.revisedText.trim(),
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions.filter(
          (item) => item?.original && item?.proposed && item?.reason,
        )
      : [],
    subtitleCandidates: Array.isArray(result.subtitleCandidates)
      ? result.subtitleCandidates.filter(
          (candidate) =>
            typeof candidate === "string" &&
            result.revisedText.includes(candidate),
        )
      : [],
    topic: typeof result.suggestedTopic === "string" ? result.suggestedTopic : "",
    slug: typeof result.suggestedSlug === "string" ? result.suggestedSlug : "",
  };
}

export default function StudioEditor() {
  const [draft, setDraft] = useState(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState(null);
  const characterCount = useMemo(
    () => draft.original.replace(/\s/g, "").length,
    [draft.original],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft({ ...emptyDraft, ...JSON.parse(saved) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, loaded]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  function updateOriginal(value) {
    setDraft((current) => ({
      ...current,
      original: value,
      revised: "",
      subtitle: "",
      suggestions: [],
      subtitleCandidates: [],
      chatGptResponse: "",
    }));
    setMessage(null);
  }

  async function prepareRevision(openChatGpt = false) {
    if (!draft.title.trim() || !draft.original.trim()) {
      setMessage({ type: "error", text: "제목과 원문을 먼저 입력해 주세요." });
      return;
    }

    const chatWindow = openChatGpt
      ? window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer")
      : null;

    try {
      await navigator.clipboard.writeText(
        editorialPrompt(draft.title, draft.original),
      );
      setDraft((current) => ({ ...current, stage: "review" }));
      setMessage({
        type: "success",
        text: openChatGpt
          ? "윤문 프롬프트를 복사하고 ChatGPT를 열었습니다."
          : "윤문 프롬프트를 복사했습니다.",
      });
    } catch {
      if (chatWindow) chatWindow.close();
      setDraft((current) => ({ ...current, stage: "review" }));
      setMessage({
        type: "error",
        text: "자동 복사가 허용되지 않았습니다. 아래 프롬프트를 직접 복사해 주세요.",
      });
    }
  }

  function importChatGptResponse() {
    if (!draft.chatGptResponse.trim()) {
      setMessage({ type: "error", text: "ChatGPT의 답변을 붙여 넣어 주세요." });
      return;
    }

    try {
      const result = parseEditorialResponse(draft.chatGptResponse);
      setDraft((current) => ({
        ...current,
        ...result,
        subtitle: result.subtitleCandidates[0] || "",
      }));
      setMessage({ type: "success", text: "윤문 제안을 불러왔습니다. 직접 검토하고 수정해 주세요." });
    } catch {
      setMessage({
        type: "error",
        text: "답변 형식을 읽지 못했습니다. JSON 전체를 다시 복사하거나, 답변을 윤문본으로 그대로 사용할 수 있습니다.",
      });
    }
  }

  function useResponseAsRevision() {
    if (!draft.chatGptResponse.trim()) {
      setMessage({ type: "error", text: "사용할 답변을 먼저 붙여 넣어 주세요." });
      return;
    }
    setDraft((current) => ({
      ...current,
      revised: current.chatGptResponse.trim(),
      suggestions: [],
      subtitleCandidates: [],
    }));
    setMessage({ type: "success", text: "붙여 넣은 내용을 윤문본으로 가져왔습니다." });
  }

  async function publish() {
    if (!window.confirm("이 승인본을 공개하고 배포하시겠습니까?")) return;

    setPending("publish");
    setMessage(null);
    const response = await fetch("/api/studio/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json();
    setPending("");

    if (!response.ok) {
      setMessage({ type: "error", text: result.error || "발행하지 못했습니다." });
      return;
    }

    setDraft({ ...emptyDraft, publishedAt: todayInSeoul() });
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage({
      type: "success",
      text: "GitHub에 원문과 승인본을 저장했습니다. 배포가 시작되었습니다.",
      publicUrl: result.publicUrl,
      commitUrl: result.commitUrl,
    });
  }

  function resetDraft() {
    if (!window.confirm("작성 중인 내용을 모두 비우시겠습니까?")) return;
    setDraft({ ...emptyDraft, publishedAt: todayInSeoul() });
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage(null);
  }

  async function logout() {
    await fetch("/api/studio/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <section className="shell studio-page">
      <header className="studio-header">
        <div>
          <p className="eyebrow">PRIVATE STUDIO</p>
          <h1>글 쓰는 곳</h1>
          <p>원문은 그대로 남기고, 승인한 문장만 세상에 내보냅니다.</p>
        </div>
        <button className="studio-text-button" type="button" onClick={logout}>나가기</button>
      </header>

      <nav className="studio-steps" aria-label="작성 단계">
        <button
          type="button"
          className={draft.stage === "write" ? "is-active" : ""}
          onClick={() => update("stage", "write")}
        >
          <span>01</span> 원문
        </button>
        <button
          type="button"
          className={draft.stage === "review" ? "is-active" : ""}
          disabled={!draft.original || !draft.title}
          onClick={() => update("stage", "review")}
        >
          <span>02</span> 윤문
        </button>
        <button
          type="button"
          className={draft.stage === "publish" ? "is-active" : ""}
          disabled={!draft.revised}
          onClick={() => update("stage", "publish")}
        >
          <span>03</span> 발행
        </button>
      </nav>

      {message ? (
        <div className={`studio-notice ${message.type}`} role="status">
          <p>{message.text}</p>
          {message.commitUrl ? <a href={message.commitUrl}>커밋 보기</a> : null}
          {message.publicUrl ? <a href={message.publicUrl}>글 주소 열기</a> : null}
        </div>
      ) : null}

      {draft.stage === "write" ? (
        <div className="studio-panel">
          <label className="studio-field">
            <span>제목</span>
            <input
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="글의 제목"
            />
          </label>
          <label className="studio-field studio-writing-field">
            <span>원문</span>
            <textarea
              value={draft.original}
              onChange={(event) => updateOriginal(event.target.value)}
              placeholder="지금의 생각과 감각을 그대로 적어보세요."
            />
          </label>
          <div className="studio-panel-footer">
            <span>{characterCount.toLocaleString("ko-KR")}자 · 이 브라우저에 자동 저장됨</span>
            <div>
              <button className="studio-secondary-button" type="button" onClick={resetDraft}>비우기</button>
              <button className="studio-secondary-button" type="button" onClick={() => prepareRevision(false)}>
                프롬프트 복사
              </button>
              <button className="studio-primary-button" type="button" onClick={() => prepareRevision(true)}>
                복사하고 ChatGPT 열기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {draft.stage === "review" ? (
        <div className="studio-review">
          {!draft.revised ? (
            <section className="studio-handoff">
              <header>
                <p className="eyebrow">CHATGPT HANDOFF</p>
                <h2>ChatGPT에서 문장을 살펴봅니다</h2>
                <p>아래 프롬프트를 ChatGPT에 보내고, 받은 답변 전체를 다시 붙여 넣어 주세요.</p>
              </header>
              <ol>
                <li><span>1</span><p>윤문 프롬프트를 복사합니다.</p></li>
                <li><span>2</span><p>로그인된 ChatGPT에서 프롬프트를 보냅니다.</p></li>
                <li><span>3</span><p>답변 전체를 복사해 아래에 붙여 넣습니다.</p></li>
              </ol>
              <label className="studio-field">
                <span>윤문 프롬프트</span>
                <textarea className="studio-prompt-preview" value={editorialPrompt(draft.title, draft.original)} readOnly />
              </label>
              <div className="studio-handoff-buttons">
                <button className="studio-secondary-button" type="button" onClick={() => prepareRevision(false)}>프롬프트 복사</button>
                <button className="studio-primary-button" type="button" onClick={() => prepareRevision(true)}>복사하고 ChatGPT 열기</button>
              </div>
              <label className="studio-field studio-response-field">
                <span>ChatGPT 답변</span>
                <textarea
                  value={draft.chatGptResponse}
                  onChange={(event) => update("chatGptResponse", event.target.value)}
                  placeholder="ChatGPT가 생성한 JSON 답변 전체를 붙여 넣으세요."
                />
              </label>
              <div className="studio-handoff-buttons">
                <button className="studio-secondary-button" type="button" onClick={useResponseAsRevision}>답변을 윤문본으로 사용</button>
                <button className="studio-primary-button" type="button" onClick={importChatGptResponse}>윤문 제안 불러오기</button>
              </div>
            </section>
          ) : (
          <>
          <div className="studio-compare">
            <label className="studio-field">
              <span>보존된 원문</span>
              <textarea value={draft.original} readOnly />
            </label>
            <label className="studio-field">
              <span>윤문 후보 · 직접 수정 가능</span>
              <textarea value={draft.revised} onChange={(event) => update("revised", event.target.value)} />
            </label>
          </div>
          <section className="studio-suggestions">
            <header>
              <h2>수정 제안</h2>
              <span>{draft.suggestions.length}개</span>
            </header>
            {draft.suggestions.map((suggestion, index) => (
              <article key={`${suggestion.original}-${index}`}>
                <p><del>{suggestion.original}</del></p>
                <p><ins>{suggestion.proposed}</ins></p>
                <small>{suggestion.reason}</small>
              </article>
            ))}
          </section>
          </>
          )}
          <div className="studio-actions">
            <button className="studio-secondary-button" type="button" onClick={() => update("stage", "write")}>원문으로 돌아가기</button>
            {draft.revised ? (
              <>
                <button className="studio-secondary-button" type="button" onClick={() => update("revised", "")}>다른 응답 가져오기</button>
                <button className="studio-primary-button" type="button" onClick={() => update("stage", "publish")}>발행 정보 확인</button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {draft.stage === "publish" ? (
        <div className="studio-publish-grid">
          <div className="studio-publish-form studio-panel">
            <label className="studio-field"><span>제목</span><input value={draft.title} onChange={(event) => update("title", event.target.value)} /></label>
            <div className="studio-field-row">
              <label className="studio-field"><span>주제</span><input value={draft.topic} onChange={(event) => update("topic", event.target.value)} /></label>
              <label className="studio-field"><span>발행일</span><input type="date" value={draft.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} /></label>
            </div>
            <label className="studio-field"><span>슬러그</span><div className="studio-slug"><span>junkyung.kim/writing/</span><input value={draft.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} /></div></label>
            <label className="studio-field"><span>핵심 문장</span><textarea className="studio-subtitle-input" value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} /></label>
            {draft.subtitleCandidates.length ? (
              <div className="studio-candidates">
                <span>본문에서 고른 후보</span>
                {draft.subtitleCandidates.map((candidate) => (
                  <button type="button" key={candidate} onClick={() => update("subtitle", candidate)}>{candidate}</button>
                ))}
              </div>
            ) : null}
          </div>
          <aside className="studio-preview">
            <span>{draft.topic || "주제"} · {draft.publishedAt}</span>
            <h2>{draft.title || "제목"}</h2>
            <p>{draft.subtitle || "핵심 문장"}</p>
            <div>{draft.revised}</div>
          </aside>
          <div className="studio-actions studio-publish-actions">
            <button className="studio-secondary-button" type="button" onClick={() => update("stage", "review")}>윤문본 다시 보기</button>
            <button className="studio-primary-button" type="button" onClick={publish} disabled={pending === "publish"}>
              {pending === "publish" ? "발행하는 중…" : "승인 및 발행"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
