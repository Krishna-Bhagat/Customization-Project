import { THIRTY_DAYS_MS } from "./storageExpiry.js";
import { debugWarn } from "./devLogger.js";
import { toSideKey } from "./productSides.js";

const DB_NAME = "giftcraft-design-previews";
const DB_VERSION = 1;
const STORE_NAME = "previews";

const PREVIEW_URI_PREFIX = "preview://";

let dbPromise = null;

const isIndexedDbSupported = () => typeof indexedDB !== "undefined";

const toPreviewUri = (previewId) => `${PREVIEW_URI_PREFIX}${previewId}`;

const normalizePreviewSide = (side) => toSideKey(side || "");

const openDb = () => {
  if (dbPromise) {
    return dbPromise;
  }

  if (!isIndexedDbSupported()) {
    return Promise.resolve(null);
  }

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("expiresAt", "expiresAt", { unique: false });
        store.createIndex("productId", "productId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      debugWarn("preview-store", "Failed to open preview IndexedDB store", request.error);
      resolve(null);
    };
  });

  return dbPromise;
};

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const dataUrlToBlob = async (dataUrl) => {
  if (!dataUrl) {
    return null;
  }

  try {
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch {
    return null;
  }
};

const randomId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const isPreviewUri = (value) =>
  typeof value === "string" && value.startsWith(PREVIEW_URI_PREFIX);

export const previewIdFromUri = (value) =>
  isPreviewUri(value) ? value.slice(PREVIEW_URI_PREFIX.length) : "";

export const sanitizeSidePreviewRefs = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [side, ref]) => {
    const sideKey = normalizePreviewSide(side);
    if (!sideKey) {
      return acc;
    }

    const normalizedRef = String(ref || "").trim();
    if (!isPreviewUri(normalizedRef)) {
      return acc;
    }

    acc[sideKey] = normalizedRef;
    return acc;
  }, {});
};

export const saveDesignPreview = async ({ productId, sideKey, dataUrl }) => {
  const db = await openDb();
  if (!db) {
    return "";
  }

  const normalizedSide = normalizePreviewSide(sideKey);
  if (!normalizedSide || !dataUrl) {
    return "";
  }

  const blob = await dataUrlToBlob(dataUrl);
  if (!blob) {
    return "";
  }

  const previewId = `preview-${normalizedSide}-${randomId()}`;
  const payload = {
    id: previewId,
    productId: String(productId || ""),
    sideKey: normalizedSide,
    blob,
    mimeType: String(blob.type || ""),
    createdAt: Date.now(),
    expiresAt: Date.now() + THIRTY_DAYS_MS
  };

  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_NAME).put(payload);
    });
    return toPreviewUri(previewId);
  } catch (error) {
    debugWarn("preview-store", "Failed to persist design preview", error);
    return "";
  }
};

export const readDesignPreviewDataUrl = async (value) => {
  const previewId = previewIdFromUri(value);
  if (!previewId) {
    return "";
  }

  const db = await openDb();
  if (!db) {
    return "";
  }

  const record = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(previewId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });

  if (!record?.blob) {
    return "";
  }

  try {
    return await readBlobAsDataUrl(record.blob);
  } catch (error) {
    debugWarn("preview-store", "Failed to decode saved design preview", error);
    return "";
  }
};

export const cleanupExpiredDesignPreviews = async () => {
  const db = await openDb();
  if (!db) {
    return 0;
  }

  const now = Date.now();
  const expiredIds = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("expiresAt");
    const cursorRequest = index.openCursor();
    const result = [];

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve(result);
        return;
      }

      const value = cursor.value;
      if (Number(value?.expiresAt) <= now) {
        result.push(String(value.id));
        cursor.continue();
        return;
      }

      resolve(result);
    };

    cursorRequest.onerror = () => resolve(result);
  });

  if (expiredIds.length === 0) {
    return 0;
  }

  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    expiredIds.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });

  return expiredIds.length;
};

export const clearDesignPreviewsForProduct = async (productId) => {
  const normalizedProductId = String(productId || "");
  if (!normalizedProductId) {
    return;
  }

  const db = await openDb();
  if (!db) {
    return;
  }

  const ids = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("productId");
    const request = index.openCursor(IDBKeyRange.only(normalizedProductId));
    const result = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(result);
        return;
      }
      result.push(String(cursor.value.id));
      cursor.continue();
    };

    request.onerror = () => resolve(result);
  });

  if (ids.length === 0) {
    return;
  }

  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

export const clearDesignPreviewsByRefs = async (refs) => {
  const normalizedRefs = sanitizeSidePreviewRefs(refs);
  const ids = Array.from(
    new Set(
      Object.values(normalizedRefs)
        .map((ref) => previewIdFromUri(ref))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) {
    return;
  }

  const db = await openDb();
  if (!db) {
    return;
  }

  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};
