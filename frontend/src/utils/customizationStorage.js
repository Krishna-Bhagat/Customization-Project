import { sanitizeSidePreviewRefs } from "./designPreviewStore.js";

const DATA_URI_PREFIX = "data:image/";
const ASSET_URI_PREFIX = "asset://";
const MAX_INLINE_IMAGE_URI_LENGTH = 32_000;

const isPlainObject = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);

const isImageDataUri = (value) =>
  typeof value === "string" &&
  value.startsWith(DATA_URI_PREFIX);

const toAssetUri = (assetId) => `${ASSET_URI_PREFIX}${assetId}`;

const sanitizeImageObjectForStorage = (object) => {
  if (!isPlainObject(object) || object.type !== "image") {
    return object;
  }

  const next = { ...object };
  const src = String(next.src || "");
  const assetId = String(next.giftAssetId || "").trim();

  if (assetId) {
    next.src = toAssetUri(assetId);
    return next;
  }

  if (isImageDataUri(src) && src.length > MAX_INLINE_IMAGE_URI_LENGTH) {
    // Drop oversized inline image payloads to prevent localStorage quota overflows.
    // Text/vector objects remain fully restorable.
    next.src = "";
  }

  return next;
};

export const sanitizeCanvasSnapshotForStorage = (snapshot) => {
  let parsed = snapshot;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return "";
    }
  }

  if (!isPlainObject(parsed)) {
    return "";
  }

  const objects = Array.isArray(parsed.objects) ? parsed.objects : [];
  const sanitized = {
    ...parsed,
    objects: objects.map((object) => sanitizeImageObjectForStorage(object))
  };

  return JSON.stringify(sanitized);
};

export const sanitizeCanvasStatesForStorage = (canvasStates) => {
  if (!isPlainObject(canvasStates)) {
    return {};
  }

  return Object.entries(canvasStates).reduce((acc, [sideKey, snapshot]) => {
    const sanitizedSnapshot = sanitizeCanvasSnapshotForStorage(snapshot);
    if (sanitizedSnapshot) {
      acc[sideKey] = sanitizedSnapshot;
    }
    return acc;
  }, {});
};

export const sanitizeCustomizationStateForStorage = (state) => {
  const source = isPlainObject(state) ? state : {};
  return {
    selectedSize: String(source.selectedSize || "").trim().toUpperCase(),
    quantity: Math.min(Math.max(Number(source.quantity) || 1, 1), 99),
    selectedSides: Array.isArray(source.selectedSides)
      ? Array.from(new Set(source.selectedSides.map((item) => String(item || "").trim()).filter(Boolean)))
      : [],
    activeSide: String(source.activeSide || "").trim(),
    sidePreviewRefs: sanitizeSidePreviewRefs(source.sidePreviewRefs),
    canvasStates: sanitizeCanvasStatesForStorage(source.canvasStates),
    savedAt: Number(source.savedAt) > 0 ? Number(source.savedAt) : Date.now()
  };
};

export const estimateCanvasStatesByteSize = (canvasStates) => {
  const normalized = sanitizeCanvasStatesForStorage(canvasStates);
  const serialized = JSON.stringify(normalized);
  return new TextEncoder().encode(serialized).length;
};

export const isAssetUri = (value) =>
  typeof value === "string" &&
  value.startsWith(ASSET_URI_PREFIX);

export const assetIdFromUri = (value) =>
  isAssetUri(value) ? value.slice(ASSET_URI_PREFIX.length) : "";
