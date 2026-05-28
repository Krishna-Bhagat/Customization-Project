import { THIRTY_DAYS_MS } from "./storageExpiry.js";
import { debugWarn } from "./devLogger.js";

const DB_NAME = "giftcraft-design-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";

let dbPromise = null;

const openDb = () => {
  if (dbPromise) {
    return dbPromise;
  }

  if (typeof indexedDB === "undefined") {
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
      debugWarn("design-asset", "Failed to open IndexedDB store", request.error);
      resolve(null);
    };
  });

  return dbPromise;
};

const readAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const randomId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const saveDesignAsset = async ({ file, productId }) => {
  const db = await openDb();
  if (!db || !file) {
    return "";
  }

  const id = `asset-${randomId()}`;
  const payload = {
    id,
    productId: String(productId || ""),
    blob: file,
    mimeType: String(file.type || ""),
    createdAt: Date.now(),
    expiresAt: Date.now() + THIRTY_DAYS_MS
  };

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put(payload);
  }).catch((error) => {
    debugWarn("design-asset", "Failed to save uploaded image asset", error);
  });

  return id;
};

export const readDesignAssetDataUrl = async (assetId) => {
  if (!assetId) {
    return "";
  }

  const db = await openDb();
  if (!db) {
    return "";
  }

  const record = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(assetId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });

  if (!record?.blob) {
    return "";
  }

  try {
    return await readAsDataUrl(record.blob);
  } catch (error) {
    debugWarn("design-asset", "Failed to decode stored image asset", error);
    return "";
  }
};

export const cleanupExpiredDesignAssets = async () => {
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

export const clearDesignAssetsForProduct = async (productId) => {
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

export const clearDesignAssetsByIds = async (assetIds = []) => {
  const ids = Array.from(
    new Set(assetIds.map((assetId) => String(assetId || "").trim()).filter(Boolean))
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
