import test from "node:test";
import assert from "node:assert/strict";
import {
  restorePendingImages,
  serializePendingImages,
} from "../lib/studio-image-store.js";

test("pending image persistence avoids duplicating preview data and restores it", () => {
  const image = {
    path: "public/media/posts/123e4567-e89b-42d3-a456-426614174000.webp",
    url: "/media/posts/123e4567-e89b-42d3-a456-426614174000.webp",
    content: "UklGRgAAAABXRUJQ",
    mimeType: "image/webp",
    previewUrl: "data:image/webp;base64,UklGRgAAAABXRUJQ",
  };

  const saved = serializePendingImages([image]);
  assert.deepEqual(saved, [{
    path: image.path,
    url: image.url,
    content: image.content,
    mimeType: image.mimeType,
  }]);
  assert.deepEqual(restorePendingImages(saved), [image]);
  assert.deepEqual(
    restorePendingImages([{ ...saved[0], content: 'AAA" onerror="alert(1)' }]),
    [],
  );
});
