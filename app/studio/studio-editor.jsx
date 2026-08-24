"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  looksLikeStructuredResponse,
  parseEditorialResponse,
  validatePublishDraft,
} from "../../lib/studio-draft";
import { buildEditorialPrompt } from "../../lib/studio-prompt";
import { renderMarkdown } from "../../lib/markdown";
import { applyMarkdownFormat, insertMarkdownImage } from "../../lib/studio-markdown";
import {
  canAddStudioImages,
  filterReferencedAssets,
  optimizeStudioImage,
} from "../../lib/studio-image";
import {
  loadPendingImages,
  savePendingImages,
} from "../../lib/studio-image-store";

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
  const [pendingImages, setPendingImages] = useState([]);
  const [imagePending, setImagePending] = useState(false);
  const [imageCandidate, setImageCandidate] = useState(null);
  const [showPasteTarget, setShowPasteTarget] = useState(false);
  const bodyEditorRef = useRef(null);
  const imageInputRef = useRef(null);
  const pasteTargetRef = useRef(null);
  const editorSelectionRef = useRef({ start: 0, end: 0 });
  const imageTargetFieldRef = useRef("revised");
  const characterCount = useMemo(
    () => draft.original.replace(/\s/g, "").length,
    [draft.original],
  );
  const referencedImages = useMemo(
    () => pendingImages.filter(
      (image) => draft.original.includes(image.url) || draft.revised.includes(image.url),
    ),
    [draft.original, draft.revised, pendingImages],
  );
  const previewHtml = useMemo(() => {
    const previews = { original: "", revised: "" };
    if (!loaded) return previews;
    for (const field of ["original", "revised"]) {
      let html = renderMarkdown(draft[field]);
      for (const image of pendingImages) {
        if (!draft[field].includes(image.url)) continue;
        html = html.replaceAll(
          `src="${image.url}"`,
          `src="${image.previewUrl}"`,
        );
      }
      previews[field] = html;
    }
    return previews;
  }, [draft.original, draft.revised, pendingImages, loaded]);

  useEffect(() => {
    let active = true;
    async function restoreDraft() {
      let restoredDraft = emptyDraft;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) restoredDraft = { ...emptyDraft, ...JSON.parse(saved) };
        if (active) setDraft(restoredDraft);
      } catch {}
      try {
        const images = await loadPendingImages();
        if (active) {
          setPendingImages(
            images.filter(
              (image) =>
                restoredDraft.original.includes(image.url) ||
                restoredDraft.revised.includes(image.url),
            ),
          );
        }
      } catch (error) {
        if (active) {
          setMessage({
            type: "error",
            text: `${error.message} 이미지는 새로고침 전에 발행해 주세요.`,
          });
        }
      } finally {
        if (active) setLoaded(true);
      }
    }
    restoreDraft();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, loaded]);

  useEffect(() => {
    if (!loaded) return;
    savePendingImages(pendingImages).catch((error) => {
      setMessage({
        type: "error",
        text: `${error.message} 이미지는 새로고침 전에 발행해 주세요.`,
      });
    });
  }, [pendingImages, loaded]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null);
    setPublishError("");
  }

  function updateOriginal(value) {
    if (draft.revised && !window.confirm(
      "원문을 수정하면 현재 윤문본과 윤문 제안이 초기화됩니다. 계속하시겠습니까?",
    )) {
      setDraft((current) => ({ ...current }));
      return;
    }
    setDraft((current) => ({
      ...current,
      original: value,
      revised: "",
      subtitle: "",
      suggestions: [],
      subtitleCandidates: [],
      chatGptResponse: "",
    }));
    setPendingImages((current) =>
      current.filter((image) => value.includes(image.url)),
    );
    setMessage(null);
  }

  function updateBody(field, value) {
    if (field === "original") updateOriginal(value);
    else update("revised", value);
  }

  function rememberEditorSelection(
    element = bodyEditorRef.current,
    field = imageTargetFieldRef.current,
  ) {
    if (!element) return;
    imageTargetFieldRef.current = field;
    editorSelectionRef.current = {
      start: element.selectionStart ?? draft[field].length,
      end: element.selectionEnd ?? draft[field].length,
    };
  }

  function restoreEditorSelection(start, end) {
    requestAnimationFrame(() => {
      const editor = bodyEditorRef.current;
      if (!editor || !document.contains(editor)) return;
      editor.focus();
      editor.setSelectionRange(start, end);
      editorSelectionRef.current = { start, end };
    });
  }

  function formatMarkdown(format, field) {
    const editor = bodyEditorRef.current;
    imageTargetFieldRef.current = field;
    const selection = editor
      ? { start: editor.selectionStart, end: editor.selectionEnd }
      : editorSelectionRef.current;
    const result = applyMarkdownFormat({
      value: draft[field],
      ...selection,
      format,
    });
    updateBody(field, result.value);
    restoreEditorSelection(result.selectionStart, result.selectionEnd);
  }

  async function prepareImage(file, field = imageTargetFieldRef.current) {
    imageTargetFieldRef.current = field;
    if (!canAddStudioImages(referencedImages.length)) {
      setMessage({ type: "error", text: "이미지는 글마다 최대 5개까지 넣을 수 있습니다." });
      return;
    }
    setPendingImages(referencedImages);
    setImagePending(true);
    setMessage(null);
    try {
      const asset = await optimizeStudioImage(file);
      setImageCandidate({
        asset,
        alt: file.name?.replace(/\.[^.]+$/, "") || "",
        caption: "",
        field,
        selection: { ...editorSelectionRef.current },
      });
      setShowPasteTarget(false);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "이미지를 처리하지 못했습니다." });
    } finally {
      setImagePending(false);
    }
  }

  function imageFileFromPaste(event) {
    return Array.from(event.clipboardData?.items || [])
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();
  }

  function handleImagePaste(event, field) {
    const file = imageFileFromPaste(event);
    if (!file) return;
    event.preventDefault();
    imageTargetFieldRef.current = field;
    if (event.currentTarget === bodyEditorRef.current) {
      rememberEditorSelection(event.currentTarget, field);
    }
    prepareImage(file, field);
  }

  async function pasteImageFromClipboard(field) {
    imageTargetFieldRef.current = field;
    rememberEditorSelection(bodyEditorRef.current, field);
    if (navigator.clipboard?.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (imageType) {
            await prepareImage(await item.getType(imageType), field);
            return;
          }
        }
      } catch {
        // Mobile Safari and some Android browsers require the system paste menu.
      }
    }
    setShowPasteTarget(true);
    setMessage({
      type: "success",
      text: "아래 붙여넣기 영역을 길게 누른 뒤 ‘붙여넣기’를 선택해 주세요.",
    });
    requestAnimationFrame(() => pasteTargetRef.current?.focus());
  }

  function confirmImageInsertion() {
    const alt = imageCandidate?.alt.trim();
    if (!alt) {
      setMessage({ type: "error", text: "이미지를 설명하는 대체 텍스트를 입력해 주세요." });
      return;
    }
    const field = imageCandidate.field || "revised";
    const result = insertMarkdownImage({
      value: draft[field],
      ...imageCandidate.selection,
      url: imageCandidate.asset.url,
      alt,
      caption: imageCandidate.caption.trim(),
    });
    setPendingImages((current) => [...current, imageCandidate.asset]);
    updateBody(field, result.value);
    setImageCandidate(null);
    restoreEditorSelection(result.selectionStart, result.selectionEnd);
  }

  async function handleSelectedImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await prepareImage(file);
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
    setPendingImages([]);
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

  function preserveImagesForRevision(revision, successText) {
    const droppedCount = pendingImages.filter(
      (image) => draft.original.includes(image.url) && !revision.includes(image.url),
    ).length;
    setPendingImages((current) =>
      current.filter(
        (image) => draft.original.includes(image.url) || revision.includes(image.url),
      ),
    );
    setMessage({
      type: droppedCount ? "warning" : "success",
      text: droppedCount
        ? `윤문본에서 이미지 ${droppedCount}개가 빠졌습니다. 원본 이미지는 안전하게 보관하고 함께 저장합니다.`
        : successText,
    });
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
      preserveImagesForRevision(
        result.revised,
        "윤문 제안을 불러왔습니다. 직접 검토하고 수정해 주세요.",
      );
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
      preserveImagesForRevision(
        result.revised,
        "JSON 답변에서 윤문 제안을 불러왔습니다.",
      );
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

    const plainRevision = draft.chatGptResponse.trim();
    setDraft((current) => ({
      ...current,
      revised: plainRevision,
      suggestions: [],
      subtitleCandidates: [],
    }));
    preserveImagesForRevision(
      plainRevision,
      "붙여 넣은 일반 텍스트를 윤문본으로 가져왔습니다.",
    );
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
        body: JSON.stringify({
          ...draft,
          assets: filterReferencedAssets(
            `${draft.original}\n${draft.revised}`,
            referencedImages,
          ),
        }),
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
      setPendingImages([]);
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
    setPendingImages([]);
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage(null);
  }

  async function logout() {
    await fetch("/api/studio/logout", { method: "POST" });
    window.location.reload();
  }

  function renderMarkdownEditor(titleId, field, description) {
    return (
      <section className="studio-markdown-editor" aria-labelledby={titleId}>
        <div className="studio-markdown-editor-header">
          <div>
            <strong id={titleId}>본문 서식과 이미지</strong>
            <span>{description}</span>
          </div>
          <span>총 {referencedImages.length}/5 이미지</span>
        </div>
        <div className="studio-format-toolbar" role="toolbar" aria-label="본문 서식">
          {[
            ["bold", "굵게"],
            ["quote", "인용"],
            ["heading", "소제목"],
            ["list", "목록"],
            ["link", "링크"],
          ].map(([format, label]) => (
            <button
              type="button"
              key={format}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => formatMarkdown(format, field)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={imagePending}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              rememberEditorSelection(bodyEditorRef.current, field);
              imageTargetFieldRef.current = field;
              imageInputRef.current?.click();
            }}
          >
            {imagePending ? "이미지 처리 중…" : "사진 선택"}
          </button>
          <button
            type="button"
            disabled={imagePending}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pasteImageFromClipboard(field)}
          >
            {imagePending ? "이미지 처리 중…" : "클립보드 붙여넣기"}
          </button>
          <input
            ref={imageInputRef}
            className="studio-hidden-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelectedImage}
          />
        </div>
        {showPasteTarget ? (
          <div
            ref={pasteTargetRef}
            className="studio-mobile-paste-target"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="클립보드 이미지 붙여넣기 영역"
            tabIndex={0}
            onPaste={(event) => handleImagePaste(event, field)}
            onInput={(event) => { event.currentTarget.textContent = ""; }}
          >
            여기를 길게 눌러 ‘붙여넣기’를 선택하세요
          </div>
        ) : null}
        <textarea
          ref={bodyEditorRef}
          className="studio-markdown-textarea"
          value={draft[field]}
          onChange={(event) => updateBody(field, event.target.value)}
          onSelect={(event) => rememberEditorSelection(event.currentTarget, field)}
          onClick={(event) => rememberEditorSelection(event.currentTarget, field)}
          onKeyUp={(event) => rememberEditorSelection(event.currentTarget, field)}
          onPaste={(event) => handleImagePaste(event, field)}
          aria-label={field === "original" ? "원문 본문" : "발행 본문"}
          placeholder={field === "original" ? "지금의 생각과 감각을 그대로 적어보세요." : "윤문본을 직접 다듬어보세요."}
        />
        <small>이미지는 붙여넣거나 사진에서 선택하면 WebP로 자동 최적화됩니다.</small>
      </section>
    );
  }

  function renderArticlePreview(extraClass = "", field = "revised") {
    return (
      <aside className={`studio-preview ${extraClass}`.trim()}>
        <span>{draft.topic || "주제"} · {draft.publishedAt}</span>
        <h2>{draft.title || "제목"}</h2>
        <p>{draft.subtitle || "핵심 문장"}</p>
        <div
          className="prose studio-preview-prose"
          dangerouslySetInnerHTML={{ __html: previewHtml[field] }}
        />
      </aside>
    );
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
          {renderMarkdownEditor(
            "write-body-editor-title",
            "original",
            "처음 쓰는 순간부터 서식과 이미지를 넣을 수 있습니다.",
          )}
          {renderArticlePreview("studio-write-preview", "original")}
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
          <div className="studio-compare studio-review-formatting">
            <label className="studio-field">
              <span>보존된 원문</span>
              <textarea value={draft.original} readOnly />
            </label>
            <div>
              {renderMarkdownEditor(
                "review-body-editor-title",
                "revised",
                "윤문본을 다듬으면서 서식과 이미지를 넣습니다.",
              )}
            </div>
          </div>
          {renderArticlePreview("studio-review-preview", "revised")}
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
            {renderMarkdownEditor(
              "publish-body-editor-title",
              "revised",
              "발행 전 최종 서식과 이미지 위치를 확인합니다.",
            )}
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
          {renderArticlePreview()}
          {publishError ? (
            <div className="studio-notice error" role="alert">
              <p>{publishError}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {imageCandidate ? (
        <div className="studio-image-dialog-backdrop" role="presentation">
          <section className="studio-image-dialog" role="dialog" aria-modal="true" aria-labelledby="image-dialog-title">
            <header>
              <div>
                <p className="eyebrow">IMAGE</p>
                <h2 id="image-dialog-title">이미지 설명</h2>
              </div>
              <button type="button" className="studio-text-button" onClick={() => setImageCandidate(null)}>닫기</button>
            </header>
            <img src={imageCandidate.asset.previewUrl} alt="삽입할 이미지 미리보기" />
            <label className="studio-field">
              <span>대체 텍스트 · 필수</span>
              <input
                autoFocus
                value={imageCandidate.alt}
                onChange={(event) => setImageCandidate((current) => ({ ...current, alt: event.target.value }))}
                placeholder="이미지에 무엇이 보이는지 설명"
              />
            </label>
            <label className="studio-field">
              <span>캡션 · 선택</span>
              <input
                value={imageCandidate.caption}
                onChange={(event) => setImageCandidate((current) => ({ ...current, caption: event.target.value }))}
                placeholder="이미지 아래에 표시할 문장"
              />
            </label>
            <div className="studio-actions">
              <button type="button" className="studio-secondary-button" onClick={() => setImageCandidate(null)}>취소</button>
              <button type="button" className="studio-primary-button" onClick={confirmImageInsertion}>본문에 넣기</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
