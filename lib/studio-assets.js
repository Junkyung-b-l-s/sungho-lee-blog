import { marked } from "marked";

export const MAX_IMAGE_COUNT = 5;
export const MAX_IMAGE_BYTES = 750 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 3 * 1024 * 1024;

function isWebP(buffer) {
  return (
    buffer.length >= 20 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.readUInt32LE(4) === buffer.length - 8 &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP" &&
    new Set(["VP8 ", "VP8L", "VP8X"]).has(
      buffer.subarray(12, 16).toString("ascii"),
    )
  );
}

function markdownImageUrls(markdown) {
  const urls = new Set();
  const tokens = marked.lexer(String(markdown || ""));
  marked.walkTokens(tokens, (token) => {
    if (token.type === "image" && typeof token.href === "string") {
      urls.add(token.href);
    }
  });
  return urls;
}

function decodeBase64(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value) ||
    value.length % 4 !== 0
  ) {
    throw new Error("이미지는 750KB 이하의 WebP 파일이어야 합니다.");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length > MAX_IMAGE_BYTES) {
    throw new Error("이미지는 각각 750KB 이하로 최적화해 주세요.");
  }
  return decoded;
}

export function validateStudioAssets(assets, { revised }) {
  if (assets == null) return [];
  if (!Array.isArray(assets)) throw new Error("이미지 목록 형식이 올바르지 않습니다.");
  if (assets.length > MAX_IMAGE_COUNT) {
    throw new Error(`이미지는 글마다 최대 ${MAX_IMAGE_COUNT}개까지 넣을 수 있습니다.`);
  }

  const seen = new Set();
  const referencedUrls = markdownImageUrls(revised);
  let totalBytes = 0;

  return assets.map((asset) => {
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
      throw new Error("이미지 정보 형식이 올바르지 않습니다.");
    }
    const path = asset.path;
    if (
      typeof path !== "string" ||
      !/^public\/media\/posts\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/.test(path)
    ) {
      throw new Error("이미지 저장 경로가 올바르지 않습니다.");
    }

    if (seen.has(path)) throw new Error("중복된 이미지 경로가 있습니다.");
    seen.add(path);
    if (asset.mimeType !== "image/webp") {
      throw new Error("이미지는 WebP 형식만 발행할 수 있습니다.");
    }

    const decoded = decodeBase64(asset.content);
    if (!isWebP(decoded)) throw new Error("이미지 데이터가 올바른 WebP 형식이 아닙니다.");
    totalBytes += decoded.length;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      throw new Error("한 글의 이미지 전체 용량은 3MB 이하여야 합니다.");
    }

    const publicUrl = `/${path.slice("public/".length)}`;
    if (!referencedUrls.has(publicUrl)) {
      throw new Error("본문에서 사용되지 않은 이미지는 발행할 수 없습니다.");
    }

    return {
      path,
      content: decoded.toString("base64"),
      encoding: "base64",
      action: "upsert",
    };
  });
}
