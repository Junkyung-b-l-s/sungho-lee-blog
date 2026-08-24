const DATABASE_NAME = "junkyung-studio-assets";
const STORE_NAME = "draft-assets";
const RECORD_KEY = "pending-images";

export function serializePendingImages(images) {
  return images.map(({ path, url, content, mimeType }) => ({
    path,
    url,
    content,
    mimeType,
  }));
}

export function restorePendingImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter(
      (image) =>
        image &&
        typeof image.path === "string" &&
        typeof image.url === "string" &&
        typeof image.content === "string" &&
        image.mimeType === "image/webp" &&
        /^public\/media\/posts\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/.test(image.path) &&
        image.url === `/${image.path.slice("public/".length)}` &&
        image.content.length <= 1_024_004 &&
        image.content.length % 4 === 0 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(image.content),
    )
    .map((image) => ({
      ...image,
      previewUrl: `data:image/webp;base64,${image.content}`,
    }));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("이 브라우저는 이미지 임시 저장을 지원하지 않습니다."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error || new Error("이미지 임시 저장소를 열지 못했습니다."));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadPendingImages() {
  const database = await openDatabase();
  try {
    const stored = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onerror = () => reject(request.error || new Error("임시 이미지를 불러오지 못했습니다."));
      request.onsuccess = () => resolve(request.result || []);
    });
    return restorePendingImages(stored);
  } finally {
    database.close();
  }
}

export async function savePendingImages(images) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("이미지를 임시 저장하지 못했습니다."));
      transaction.objectStore(STORE_NAME).put(serializePendingImages(images), RECORD_KEY);
    });
  } finally {
    database.close();
  }
}

export async function clearPendingImages() {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("임시 이미지를 비우지 못했습니다."));
      transaction.objectStore(STORE_NAME).delete(RECORD_KEY);
    });
  } finally {
    database.close();
  }
}
