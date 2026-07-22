import matter from "gray-matter";

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "").slice(0, 60);
}

export function isSafeStudioContentPath(value, directory) {
  return (
    typeof value === "string" &&
    new RegExp(`^content/${directory}/[^/]+\\.md$`).test(value)
  );
}

export function buildStudioPostFiles(draft) {
  const generatedFilename = `${draft.publishedAt.replaceAll("-", "")}_${safeFilename(draft.title)}.md`;
  const sourceOriginalPath = draft.sourceOriginalPath?.trim();
  const sourcePublishedPath = draft.sourcePublishedPath?.trim();
  const editing = Boolean(sourceOriginalPath || sourcePublishedPath);

  if (
    editing &&
    (!isSafeStudioContentPath(sourceOriginalPath, "originals") ||
      !isSafeStudioContentPath(sourcePublishedPath, "published"))
  ) {
    throw new Error("수정할 글의 경로가 올바르지 않습니다.");
  }

  const originalPath = editing
    ? sourceOriginalPath
    : `content/originals/${generatedFilename}`;
  const publishedPath = editing
    ? sourcePublishedPath
    : `content/published/${generatedFilename}`;
  const originalContent = `${draft.original.trim()}\n`;
  const publishedContent = matter.stringify(`${draft.revised.trim()}\n`, {
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    subtitle: draft.subtitle.trim(),
    publishedAt: draft.publishedAt.trim(),
    updatedAt: (draft.updatedAt || draft.publishedAt).trim(),
    topic: draft.topic.trim(),
    type: "essay",
    visibility: "public",
    original: `../originals/${originalPath.split("/").at(-1)}`,
  });

  const files = editing
    ? [{ path: publishedPath, content: publishedContent }]
    : [
        { path: originalPath, content: originalContent },
        { path: publishedPath, content: publishedContent },
      ];

  return {
    editing,
    originalPath,
    publishedPath,
    originalContent,
    publishedContent,
    files,
  };
}

export function editablePostFromSources({
  publishedPath,
  publishedSource,
  originalSource,
}) {
  if (!isSafeStudioContentPath(publishedPath, "published")) {
    throw new Error("발행 글 경로가 올바르지 않습니다.");
  }

  const { data, content } = matter(publishedSource);
  const originalFilename = String(data.original || "").split("/").at(-1);
  const sourceOriginalPath = `content/originals/${originalFilename}`;
  if (!isSafeStudioContentPath(sourceOriginalPath, "originals")) {
    throw new Error("원문 경로가 올바르지 않습니다.");
  }

  return {
    title: String(data.title || ""),
    original: originalSource.trim(),
    revised: content.trim(),
    subtitle: String(data.subtitle || ""),
    topic: String(data.topic || ""),
    slug: String(data.slug || ""),
    publishedAt: String(data.publishedAt || ""),
    sourceOriginalPath,
    sourcePublishedPath: publishedPath,
  };
}
