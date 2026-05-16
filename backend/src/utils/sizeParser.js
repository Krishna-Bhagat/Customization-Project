import { normalizeSizeList } from "../constants/productMeta.js";

export const parseSizesInput = (input) => {
  if (input === undefined || input === null) {
    return [];
  }

  if (Array.isArray(input)) {
    return normalizeSizeList(input);
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeSizeList(parsed);
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalizeSizeList(trimmed.split(","));
  }

  return [];
};
