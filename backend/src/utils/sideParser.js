import { normalizeSideList } from "../constants/productMeta.js";

export const parseSidesInput = (input) => {
  if (input === undefined || input === null) {
    return [];
  }

  if (Array.isArray(input)) {
    return normalizeSideList(input);
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeSideList(parsed);
      }
      if (typeof parsed === "object" && parsed !== null) {
        return normalizeSideList(Object.values(parsed));
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalizeSideList(trimmed.split(","));
  }

  return [];
};