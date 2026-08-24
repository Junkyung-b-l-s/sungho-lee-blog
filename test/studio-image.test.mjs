import test from "node:test";
import assert from "node:assert/strict";
import {
  canAddStudioImages,
  createStudioImageLocation,
  filterReferencedAssets,
  validateEncodedImage,
  validateImageCandidate,
} from "../lib/studio-image.js";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

test("creates a stable repository path and public URL for pasted images", () => {
  assert.deepEqual(createStudioImageLocation(uuid), {
    path: `public/media/posts/${uuid}.webp`,
    url: `/media/posts/${uuid}.webp`,
  });
});

test("accepts common source images and rejects unsupported or huge files", () => {
  assert.equal(validateImageCandidate({ type: "image/jpeg", size: 2_000_000 }), "");
  assert.equal(validateImageCandidate({ type: "image/png", size: 2_000_000 }), "");
  assert.match(validateImageCandidate({ type: "image/svg+xml", size: 1000 }), /JPG, PNG, WebP/);
  assert.match(validateImageCandidate({ type: "image/jpeg", size: 16 * 1024 * 1024 }), /15MB/);
});

test("rejects browsers that silently fall back from WebP to PNG", () => {
  assert.throws(
    () => validateEncodedImage({ type: "image/png", size: 1000 }),
    /WebP 변환을 지원하지 않습니다/,
  );
  assert.doesNotThrow(() => validateEncodedImage({ type: "image/webp", size: 1000 }));
});

test("only sends pending assets still referenced by the approved body", () => {
  const used = { url: `/media/posts/${uuid}.webp`, path: "used", content: "a" };
  const removed = { url: "/media/posts/removed.webp", path: "removed", content: "b" };
  assert.deepEqual(
    filterReferencedAssets(`![설명](${used.url})`, [used, removed]),
    [{ path: "used", content: "a" }],
  );
  assert.equal(
    canAddStudioImages(filterReferencedAssets(`![설명](${used.url})`, [used, removed]).length),
    true,
  );
});
