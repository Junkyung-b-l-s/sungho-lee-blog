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
  stage: "write",
};

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
    }));
    setMessage(null);
  }

  async function requestRevision() {
    if (!draft.title.trim() || !draft.original.trim()) {
      setMessage({ type: "error", text: "제목과 원문을 먼저 입력해 주세요." });
      return;
    }

    setPending("revise");
    setMessage(null);
    const response = await fetch("/api/studio/revise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, original: draft.original }),
    });
    const result = await response.json();
    setPending("");

    if (!response.ok) {
      setMessage({ type: "error", text: result.error || "제안을 받지 못했습니다." });
      return;
    }

    setDraft((current) => ({
      ...current,
      revised: result.revisedText,
      suggestions: result.suggestions,
      subtitleCandidates: result.subtitleCandidates,
      subtitle: result.subtitleCandidates[0] || "",
      topic: result.suggestedTopic,
      slug: result.suggestedSlug,
      stage: "review",
    }));
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
    <section className="studio-page">
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
          disabled={!draft.revised}
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
              <button className="studio-primary-button" type="button" onClick={requestRevision} disabled={pending === "revise"}>
                {pending === "revise" ? "문장을 살펴보는 중…" : "윤문 제안 받기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {draft.stage === "review" ? (
        <div className="studio-review">
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
          <div className="studio-actions">
            <button className="studio-secondary-button" type="button" onClick={() => update("stage", "write")}>원문으로 돌아가기</button>
            <button className="studio-primary-button" type="button" onClick={() => update("stage", "publish")}>발행 정보 확인</button>
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
