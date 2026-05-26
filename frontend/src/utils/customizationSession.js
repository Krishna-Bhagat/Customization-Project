import { getWithExpiry, removeKey, setWithExpiry, THIRTY_DAYS_MS } from "./storageExpiry.js";

const SESSION_PREFIX = "giftcraft-customization-";
const IMPORT_DISMISS_PREFIX = "giftcraft-draft-import-dismiss-";

const baseKey = (productId) => `${SESSION_PREFIX}${productId}`;

export const readCustomizationSession = (productId) => {
  const value = getWithExpiry(baseKey(productId));
  if (!value || typeof value !== "object") {
    return null;
  }
  return value;
};

export const writeCustomizationSession = (productId, payload) => {
  const current = readCustomizationSession(productId) || {};
  const next = {
    ...current,
    ...payload,
    savedAt: Date.now()
  };
  setWithExpiry({
    key: baseKey(productId),
    value: next,
    ttlMs: THIRTY_DAYS_MS
  });
  return next;
};

export const clearCustomizationSession = (productId) => {
  removeKey(baseKey(productId));
  removeKey(`${IMPORT_DISMISS_PREFIX}${productId}`);
};

export const clearAllCustomizationSessions = () => {
  const keysToDelete = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      String(key || "").startsWith(SESSION_PREFIX) ||
      String(key || "").startsWith(IMPORT_DISMISS_PREFIX)
    ) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));
};

export const makeTransparentDataUrl = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  return canvas.toDataURL("image/png");
};

export const isDraftImportDismissed = (productId) =>
  Boolean(getWithExpiry(`${IMPORT_DISMISS_PREFIX}${productId}`));

export const dismissDraftImportPrompt = (productId) => {
  setWithExpiry({
    key: `${IMPORT_DISMISS_PREFIX}${productId}`,
    value: true,
    ttlMs: THIRTY_DAYS_MS
  });
};
