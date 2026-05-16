const SESSION_PREFIX = "giftcraft-customization-";

const baseKey = (productId) => `${SESSION_PREFIX}${productId}`;

export const readCustomizationSession = (productId) => {
  const raw = sessionStorage.getItem(baseKey(productId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const writeCustomizationSession = (productId, payload) => {
  const current = readCustomizationSession(productId) || {};
  const next = {
    ...current,
    ...payload
  };
  sessionStorage.setItem(baseKey(productId), JSON.stringify(next));
  return next;
};

export const clearCustomizationSession = (productId) => {
  const key = baseKey(productId);
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const clearAllCustomizationSessions = () => {
  [sessionStorage, localStorage].forEach((storage) => {
    const keysToDelete = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (String(key || "").startsWith(SESSION_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => storage.removeItem(key));
  });
};

export const makeTransparentDataUrl = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  return canvas.toDataURL("image/png");
};
