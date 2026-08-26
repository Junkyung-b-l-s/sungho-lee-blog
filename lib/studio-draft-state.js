const SUBSTANTIVE_FIELDS = [
  "title",
  "original",
  "revised",
  "subtitle",
  "topic",
  "slug",
  "chatGptResponse",
];

function hasSubstantiveContent(draft) {
  return SUBSTANTIVE_FIELDS.some((field) => String(draft[field] || "").trim());
}

export function reconcileStoredDraft({
  emptyDraft,
  storedDraft = {},
  publishedPosts = null,
  today,
}) {
  const draft = { ...emptyDraft, ...storedDraft };
  const editing = Boolean(draft.sourcePublishedPath);
  const canValidateEdit = Array.isArray(publishedPosts);
  const editStillExists = canValidateEdit && publishedPosts.some(
    (post) => post.sourcePublishedPath === draft.sourcePublishedPath,
  );

  if (editing && canValidateEdit && !editStillExists) {
    return {
      staleEditCleared: true,
      draft: {
        ...draft,
        sourceOriginalPath: "",
        sourcePublishedPath: "",
        publishedAt: today,
      },
    };
  }

  if (!editing && !hasSubstantiveContent(draft)) {
    return {
      staleEditCleared: false,
      draft: { ...draft, publishedAt: today },
    };
  }

  return { staleEditCleared: false, draft };
}
