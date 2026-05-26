import { SIDE_OPTIONS, getPrintableArea, normalizeSideKey } from "../constants/customizer.js";

const SIDE_ALIASES = {
  leftsleeve: "left-sleeve",
  rightsleeve: "right-sleeve"
};

export const toSideKey = (value) => {
  const normalized = normalizeSideKey(value);
  return SIDE_ALIASES[normalized] || normalized;
};

export const formatSideLabel = (value) =>
  String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const getPreviewClassForSide = (sideKey) => {
  const key = String(sideKey || "").toLowerCase();

  if (key.includes("left") && key.includes("sleeve")) {
    return "-rotate-[4deg]";
  }

  if (key.includes("right") && key.includes("sleeve")) {
    return "rotate-[4deg]";
  }

  return "";
};

const normalizeArea = (area, category, sideKey) => {
  if (!area || typeof area !== "object") {
    const fallback = getPrintableArea(category, sideKey);
    return {
      left: fallback.left,
      top: fallback.top,
      width: fallback.width,
      height: fallback.height
    };
  }

  const left = Number(area.left ?? area.x);
  const top = Number(area.top ?? area.y);
  const width = Number(area.width);
  const height = Number(area.height);

  const fallback = getPrintableArea(category, sideKey);

  return {
    left: Number.isFinite(left) ? left : fallback.left,
    top: Number.isFinite(top) ? top : fallback.top,
    width: Number.isFinite(width) ? width : fallback.width,
    height: Number.isFinite(height) ? height : fallback.height
  };
};

const getFallbackSideKeys = (category) => {
  const normalizedCategory = String(category || "").toLowerCase();
  if (normalizedCategory.includes("handkerchief")) {
    return ["front"];
  }
  return ["front", "back"];
};

export const buildProductSideOptions = (product, { fallbackImage = "" } = {}) => {
  const sideRows = Array.isArray(product?.sides) ? product.sides : [];

  if (sideRows.length > 0) {
    const sideKeySet = new Set();

    return sideRows
      .map((sideRow) => {
        const key = toSideKey(sideRow.sideKey || sideRow.sideName);
        if (!key || sideKeySet.has(key)) {
          return null;
        }

        sideKeySet.add(key);

        const label = sideRow.sideName || formatSideLabel(key);
        const canonical = SIDE_OPTIONS.find((side) => toSideKey(side.key) === key);
        const shortLabel = canonical?.shortLabel || label;

        return {
          key,
          label,
          shortLabel,
          previewClass: getPreviewClassForSide(key),
          mockupImage: sideRow.mockupImage || fallbackImage,
          printableArea: normalizeArea(sideRow.printableArea, product?.category, key)
        };
      })
      .filter(Boolean);
  }

  return getFallbackSideKeys(product?.category).map((key) => {
    const canonical = SIDE_OPTIONS.find((side) => side.key === key);
    const label = canonical?.label || formatSideLabel(key);
    const shortLabel = canonical?.shortLabel || label;

    return {
      key,
      label,
      shortLabel,
      previewClass: getPreviewClassForSide(key),
      mockupImage: fallbackImage,
      printableArea: normalizeArea(null, product?.category, key)
    };
  });
};

export const buildSideLabelMap = (sideOptions) =>
  (sideOptions || []).reduce((acc, side) => {
    acc[side.key] = side.shortLabel || side.label;
    return acc;
  }, {});
