const SOURCE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_PUBLISHED_BYTES = 750 * 1024;
const MAX_IMAGE_COUNT = 5;

export function createStudioImageLocation(id = crypto.randomUUID()) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("이미지 식별자가 올바르지 않습니다.");
  }
  return {
    path: `public/media/posts/${id}.webp`,
    url: `/media/posts/${id}.webp`,
  };
}

export function validateImageCandidate(file) {
  if (!file || !SOURCE_IMAGE_TYPES.has(file.type)) {
    return "JPG, PNG, WebP 이미지만 사용할 수 있습니다.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_SOURCE_BYTES) {
    return "원본 이미지는 15MB 이하여야 합니다.";
  }
  return "";
}

export function filterReferencedAssets(markdown, assets) {
  const source = String(markdown || "");
  return assets
    .filter((asset) => source.includes(asset.url))
    .map(({ url: _url, previewUrl: _previewUrl, ...asset }) => asset);
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch {
        throw new Error("이미지 파일을 읽지 못했습니다.");
      }
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } catch {
    throw new Error("이미지 파일을 읽지 못했습니다.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToWebP(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("이 브라우저에서 WebP 이미지를 만들지 못했습니다."));
        else resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

export function validateEncodedImage(blob) {
  if (!blob || blob.type !== "image/webp") {
    throw new Error("이 브라우저는 WebP 변환을 지원하지 않습니다. 최신 브라우저에서 다시 시도해 주세요.");
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 데이터를 읽지 못했습니다."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
}

export async function optimizeStudioImage(file) {
  const validationError = validateImageCandidate(file);
  if (validationError) throw new Error(validationError);

  const image = await decodeImage(file);
  try {
    const sourceWidth = image.width || image.naturalWidth;
    const sourceHeight = image.height || image.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("이미지 크기를 확인하지 못했습니다.");

    const attempts = [
      { maxSide: 1600, quality: 0.84 },
      { maxSide: 1600, quality: 0.72 },
      { maxSide: 1280, quality: 0.76 },
      { maxSide: 1024, quality: 0.7 },
    ];
    let output;

    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.maxSide / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("이미지를 처리하지 못했습니다.");
      context.drawImage(image, 0, 0, width, height);
      output = await canvasToWebP(canvas, attempt.quality);
      validateEncodedImage(output);
      if (output.size <= MAX_PUBLISHED_BYTES) break;
    }

    if (!output || output.size > MAX_PUBLISHED_BYTES) {
      throw new Error("이미지를 750KB 이하로 줄이지 못했습니다. 더 작은 이미지를 선택해 주세요.");
    }

    const content = await blobToBase64(output);
    const location = createStudioImageLocation();
    return {
      ...location,
      content,
      mimeType: "image/webp",
      previewUrl: `data:image/webp;base64,${content}`,
    };
  } finally {
    if (typeof image.close === "function") image.close();
  }
}

export function canAddStudioImages(currentCount, incomingCount = 1) {
  return currentCount + incomingCount <= MAX_IMAGE_COUNT;
}
