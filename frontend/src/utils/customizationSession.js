import { getWithExpiry, removeKey, setWithExpiry, THIRTY_DAYS_MS } from "./storageExpiry.js";
import {
  sanitizeCanvasStatesForStorage
} from "./customizationStorage.js";
import { debugWarn } from "./devLogger.js";
import { cleanupExpiredDesignAssets, clearDesignAssetsForProduct } from "./designAssetStore.js";
import {
  cleanupExpiredDesignPreviews,
  clearDesignPreviewsForProduct,
  sanitizeSidePreviewRefs
} from "./designPreviewStore.js";
import { toSideKey } from "./productSides.js";

const SESSION_PREFIX = "giftcraft-customization-";

const baseKey = (productId) => `${SESSION_PREFIX}${productId}`;

const normalizeSelectedSides = (sides) => {
  const source = Array.isArray(sides) ? sides : [];
  return Array.from(new Set(source.map((side) => toSideKey(side)).filter(Boolean)));
};

export const readCustomizationSession = (productId) => {
  const value = getWithExpiry(baseKey(productId));
  if (!value || typeof value !== "object") {
    return null;
  }
  return value;
};

export const writeCustomizationSession = (productId, payload) => {
  const sanitizedCanvasStates = sanitizeCanvasStatesForStorage(payload?.canvasStates || {});
  const source = String(payload?.source || "").trim() === "cart-edit" ? "cart-edit" : "product-flow";
  const cartItemId = payload?.cartItemId ? String(payload.cartItemId) : "";
  const next = {
    selectedSize: String(payload?.selectedSize || "").trim().toUpperCase(),
    quantity: Math.min(Math.max(Number(payload?.quantity) || 1, 1), 99),
    selectedSides: normalizeSelectedSides(payload?.selectedSides),
    activeSide: toSideKey(payload?.activeSide || ""),
    source,
    cartItemId: source === "cart-edit" ? cartItemId : "",
    sidePreviewRefs: sanitizeSidePreviewRefs(payload?.sidePreviewRefs || {}),
    canvasStates: sanitizedCanvasStates,
    savedAt: Number(payload?.savedAt) > 0 ? Number(payload.savedAt) : Date.now()
  };
  const persisted = setWithExpiry({
    key: baseKey(productId),
    value: next,
    ttlMs: THIRTY_DAYS_MS
  });

  if (!persisted) {
    debugWarn("storage", "Failed to persist local customization session", {
      productId: String(productId),
      sideCount: Array.isArray(next.selectedSides) ? next.selectedSides.length : 0
    });
  }

  cleanupExpiredDesignAssets().catch(() => {});
  cleanupExpiredDesignPreviews().catch(() => {});
  return {
    ...next,
    persisted
  };
};

export const clearCustomizationSession = (
  productId,
  { clearStoredMedia = true } = {}
) => {
  removeKey(baseKey(productId));
  if (clearStoredMedia) {
    clearDesignAssetsForProduct(productId).catch(() => {});
    clearDesignPreviewsForProduct(productId).catch(() => {});
  }
};

export const clearAllCustomizationSessions = () => {
  const keysToDelete = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (String(key || "").startsWith(SESSION_PREFIX)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));
};
