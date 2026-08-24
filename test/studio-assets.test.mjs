import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMAGE_BYTES,
  validateStudioAssets,
} from "../lib/studio-assets.js";

function webpBase64(payload = "image", size = 20 + Buffer.byteLength(payload)) {
  const container = Buffer.alloc(size);
  container.write("RIFF", 0, "ascii");
  container.writeUInt32LE(size - 8, 4);
  container.write("WEBP", 8, "ascii");
  container.write("VP8 ", 12, "ascii");
  container.writeUInt32LE(size - 20, 16);
  container.write(payload, 20, "utf8");
  return container.toString("base64");
}

const path = "public/media/posts/123e4567-e89b-42d3-a456-426614174000.webp";
const url = "/media/posts/123e4567-e89b-42d3-a456-426614174000.webp";

test("validates referenced WebP assets and prepares GitHub blobs", () => {
  const files = validateStudioAssets(
    [{ path, content: webpBase64(), mimeType: "image/webp" }],
    { publishedAt: "2026-08-24", revised: `앞\n\n![설명](${url})\n\n뒤` },
  );

  assert.deepEqual(files, [
    {
      path,
      content: webpBase64(),
      encoding: "base64",
      action: "upsert",
    },
  ]);
});

test("rejects unreferenced, forged, duplicate, or oversized image assets", () => {
  const valid = { path, content: webpBase64(), mimeType: "image/webp" };
  assert.throws(
    () => validateStudioAssets([valid], { publishedAt: "2026-08-24", revised: "본문" }),
    /본문에서 사용되지 않은 이미지/,
  );
  assert.throws(
    () => validateStudioAssets([{ ...valid, content: Buffer.from("not-webp").toString("base64") }], { publishedAt: "2026-08-24", revised: url }),
    /WebP 형식/,
  );
  assert.throws(
    () => validateStudioAssets([valid, valid], { revised: `![설명](${url})` }),
    /중복/,
  );
  const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64");
  assert.throws(
    () => validateStudioAssets([{ ...valid, content: oversized }], { publishedAt: "2026-08-24", revised: url }),
    /750KB 이하/,
  );
});

test("rejects paths outside the dedicated post media directory", () => {
  assert.throws(
    () => validateStudioAssets([{ path: "public/escape.webp", content: webpBase64(), mimeType: "image/webp" }], { revised: "escape.webp" }),
    /경로/,
  );
  assert.throws(
    () => validateStudioAssets([{ path: path.replace("public", "PUBLIC"), content: webpBase64(), mimeType: "image/webp" }], { revised: url }),
    /경로/,
  );
  assert.throws(
    () => validateStudioAssets([{ path: path.replace(".webp", ".WEBP"), content: webpBase64(), mimeType: "image/webp" }], { revised: url }),
    /경로/,
  );
});

test("rejects forged WebP containers and canonicalizes accepted base64", () => {
  const forged = Buffer.alloc(20);
  forged.write("RIFF", 0, "ascii");
  forged.writeUInt32LE(999, 4);
  forged.write("WEBP", 8, "ascii");
  forged.write("NOPE", 12, "ascii");
  assert.throws(
    () => validateStudioAssets([{ path, content: forged.toString("base64"), mimeType: "image/webp" }], { revised: url }),
    /WebP 형식/,
  );

  const canonical = webpBase64();
  const result = validateStudioAssets([{ path, content: canonical, mimeType: "image/webp" }], { revised: `![설명](${url})` });
  assert.equal(result[0].content, Buffer.from(canonical, "base64").toString("base64"));
});

test("enforces image count and aggregate byte limits", () => {
  const assets = Array.from({ length: 6 }, (_, index) => {
    const id = `123e4567-e89b-42d3-a456-42661417400${index}`;
    return {
      path: `public/media/posts/${id}.webp`,
      content: webpBase64("", 700 * 1024),
      mimeType: "image/webp",
    };
  });
  const revised = assets.map((asset) => `![설명](/${asset.path.slice(7)})`).join("\n");
  assert.throws(() => validateStudioAssets(assets, { revised }), /최대 5개/);
  assert.throws(() => validateStudioAssets(assets.slice(0, 5), { revised }), /전체 용량은 3MB/);
});

test("requires the asset URL to be used by Markdown image syntax", () => {
  assert.throws(
    () => validateStudioAssets([{ path, content: webpBase64(), mimeType: "image/webp" }], { revised: `참고 경로: ${url}` }),
    /본문에서 사용되지 않은 이미지/,
  );
});
