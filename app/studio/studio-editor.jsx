"use client";

import { useEffect, useMemo, useState } from "react";
import {
  looksLikeStructuredResponse,
  parseEditorialResponse,
  validatePublishDraft,
} from "../../lib/studio-draft";
import { buildEditorialPrompt } from "../../lib/studio-prompt";

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
  sourceOriginalPath: "",
  sourcePublishedPath: "",
  stage: "write",
};

export default function StudioEditor() {
  const [draft, setDraft] = useState(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [selectedPostPath, setSelectedPostPath] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(false);
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
    setPublishError("");
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

  async function loadPublishedPosts() {
    setLoadingPosts(true);
    setMessage(null);
    try {
      const response = await fetch("/api/studio/posts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "발행 글을 불러오지 못했습니다.");
      setPublishedPosts(result.posts || []);
      setSelectedPostPath(result.posts?.[0]?.sourcePublishedPath || "");
      if (!result.posts?.length) {
        setMessage({ type: "error", text: "수정할 발행 글이 없습니다." });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message || "발행 글을 불러오지 못했습니다." });
    } finally {
      setLoadingPosts(false);
    }
  }

  function editSelectedPost() {
    const post = publishedPosts.find(
      (candidate) => candidate.sourcePublishedPath === selectedPostPath,
    );
    if (!post) {
      setMessage({ type: "error", text: "수정할 글을 선택해 주세요." });
      return;
    }

    setDraft({
      ...emptyDraft,
      ...post,
      stage: "publish",
      publishedAt: post.publishedAt || todayInSeoul(),
    });
    setMessage({ type: "success", text: "발행된 글을 불러왔습니다. 수정 후 저장해 주세요." });
    setPublishError("");
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
        buildEditorialPrompt(draft.title, draft.original),
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

    try {
      const result = parseEditorialResponse(draft.chatGptResponse);
      setDraft((current) => ({
        ...current,
        ...result,
        subtitle: result.subtitleCandidates[0] || "",
      }));
      setMessage({ type: "success", text: "JSON 답변에서 윤문 제안을 불러왔습니다." });
      return;
    } catch {
      if (looksLikeStructuredResponse(draft.chatGptResponse)) {
        setMessage({
          type: "error",
          text: "JSON 형식의 답변 전체를 윤문본으로 사용할 수 없습니다. 답변 전체를 다시 복사해 ‘윤문 제안 불러오기’를 눌러 주세요.",
        });
        return;
      }
    }

    setDraft((current) => ({
      ...current,
      revised: current.chatGptResponse.trim(),
      suggestions: [],
      subtitleCandidates: [],
    }));
    setMessage({ type: "success", text: "붙여 넣은 일반 텍스트를 윤문본으로 가져왔습니다." });
  }

  async function publish() {
    const validationError = validatePublishDraft(draft);
    if (validationError) {
      setPublishError(validationError);
      return;
    }
    const editing = Boolean(draft.sourcePublishedPath);
    if (
      !window.confirm(
        editing
          ? "수정한 내용을 저장하고 다시 배포하시겠습니까?"
          : "이 승인본을 공개하고 배포하시겠습니까?",
      )
    ) return;

    setPending("publish");
    setMessage(null);
    setPublishError("");

    try {
      const response = await fetch("/api/studio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {};

      if (!response.ok) {
        setPublishError(result.error || `발행하지 못했습니다. (${response.status})`);
        return;
      }

      setDraft({ ...emptyDraft, publishedAt: todayInSeoul() });
      window.localStorage.removeItem(STORAGE_KEY);
      setMessage({
        type: "success",
        text: editing
          ? "수정 내용을 GitHub에 저장했습니다. 재배포가 시작되었습니다."
          : "GitHub에 원문과 승인본을 저장했습니다. 배포가 시작되었습니다.",
        publicUrl: result.publicUrl,
        commitUrl: result.commitUrl,
      });
    } catch {
      setPublishError("네트워크 오류로 발행하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setPending("");
    }
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
          <section className="studio-existing-posts">
            <div>
              <div>
                <strong>발행된 글 수정</strong>
                <span>기존 글을 불러와 제목·주제·날짜·부제목과 본문을 수정합니다.</span>
              </div>
              <button
                className="studio-secondary-button"
                type="button"
                onClick={loadPublishedPosts}
                disabled={loadingPosts}
              >
                {loadingPosts ? "불러오는 중…" : "발행 글 불러오기"}
              </button>
            </div>
            {publishedPosts.length ? (
              <div>
                <select
                  aria-label="수정할 발행 글"
                  value={selectedPostPath}
                  onChange={(event) => setSelectedPostPath(event.target.value)}
                >
                  {publishedPosts.map((post) => (
                    <option key={post.sourcePublishedPath} value={post.sourcePublishedPath}>
                      {post.publishedAt} · {post.title}
                    </option>
                  ))}
                </select>
                <button className="studio-primary-button" type="button" onClick={editSelectedPost}>
                  선택한 글 수정
                </button>
              </div>
            ) : null}
          </section>
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
                <textarea className="studio-prompt-preview" value={buildEditorialPrompt(draft.title, draft.original)} readOnly />
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
          {publishError ? (
            <div className="studio-notice error" role="alert">
              <p>{publishError}</p>
            </div>
          ) : null}
          <div className="studio-actions studio-publish-actions">
            <button className="studio-secondary-button" type="button" onClick={() => update("stage", "review")}>윤문본 다시 보기</button>
            <button className="studio-primary-button" type="button" onClick={publish} disabled={pending === "publish"}>
              {pending === "publish"
                ? draft.sourcePublishedPath
                  ? "저장하는 중…"
                  : "발행하는 중…"
                : draft.sourcePublishedPath
                  ? "수정 저장"
                  : "승인 및 발행"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
