const DAY_MS = 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * DAY_MS;

export const setWithExpiry = ({ key, value, ttlMs = THIRTY_DAYS_MS }) => {
  const payload = {
    value,
    expiresAt: Date.now() + ttlMs
  };
  localStorage.setItem(key, JSON.stringify(payload));
};

export const getWithExpiry = (key) => {
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
