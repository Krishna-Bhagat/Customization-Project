const DAY_MS = 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * DAY_MS;

const STORAGE_KEY_PREFIX = "giftcraft-";
const SESSION_KEY_PREFIX = "giftcraft-customization-";
const GUEST_CART_KEY = "giftcraft-guest-cart";

const isQuotaExceeded = (error) =>
  Boolean(error) &&
  (error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014);

const listStorageKeys = () => {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
};

export const cleanupExpiredStorageEntries = ({ keyPrefix = STORAGE_KEY_PREFIX } = {}) => {
  const now = Date.now();
  let removedCount = 0;

  listStorageKeys().forEach((key) => {
    if (keyPrefix && !String(key).startsWith(keyPrefix)) {
      return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }

    try {
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object") {
        return;
      }

      if (Number(payload.expiresAt) > 0 && Number(payload.expiresAt) <= now) {
        localStorage.removeItem(key);
        removedCount += 1;
      }
    } catch {
      // keep non-JSON values untouched
    }
  });

  return removedCount;
};

const evictStorageCandidates = ({ excludeKey = "" } = {}) => {
  const candidates = [];

  listStorageKeys().forEach((key) => {
    if (key === excludeKey) {
      return;
    }

    if (
      !String(key).startsWith(SESSION_KEY_PREFIX) &&
      key !== GUEST_CART_KEY
    ) {
      return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }

    let expiresAt = Number.MAX_SAFE_INTEGER;
    let sizeHint = raw.length;
    try {
      const payload = JSON.parse(raw);
      if (payload && typeof payload === "object") {
        expiresAt = Number(payload.expiresAt) > 0 ? Number(payload.expiresAt) : Number.MAX_SAFE_INTEGER;
        sizeHint = JSON.stringify(payload.value || payload).length;
      }
    } catch {
      // keep fallback values
    }

    candidates.push({
      key,
      expiresAt,
      sizeHint
    });
  });

  candidates.sort((a, b) => {
    if (a.expiresAt !== b.expiresAt) {
      return a.expiresAt - b.expiresAt;
    }
    return b.sizeHint - a.sizeHint;
  });

  return candidates.map((entry) => entry.key);
};

export const setWithExpiry = ({ key, value, ttlMs = THIRTY_DAYS_MS }) => {
  const payload = {
    value,
    expiresAt: Date.now() + ttlMs
  };
  const serialized = JSON.stringify(payload);

  const tryWrite = () => {
    localStorage.setItem(key, serialized);
    return true;
  };

  try {
    return tryWrite();
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      return false;
    }
  }

  cleanupExpiredStorageEntries();

  try {
    return tryWrite();
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      return false;
    }
  }

  const evictableKeys = evictStorageCandidates({ excludeKey: key });
  for (const candidateKey of evictableKeys) {
    localStorage.removeItem(candidateKey);
    try {
      return tryWrite();
    } catch (error) {
      if (!isQuotaExceeded(error)) {
        return false;
      }
    }
  }

  return false;
};

export const getWithExpiry = (key) => {
  cleanupExpiredStorageEntries();
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object") {
      localStorage.removeItem(key);
      return null;
    }

    if (Number(payload.expiresAt) <= Date.now()) {
      localStorage.removeItem(key);
      return null;
    }

    return payload.value ?? null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export const removeKey = (key) => {
  localStorage.removeItem(key);
};
