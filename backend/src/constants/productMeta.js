export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export const DEFAULT_SIDE_OPTIONS = ["Front", "Back"];

export const DEFAULT_PRINTABLE_AREA = {
  x: 90,
  y: 108,
  width: 150,
  height: 198
};

const DEFAULT_SIDE_PRINTABLE_PRESETS = {
  front: { ...DEFAULT_PRINTABLE_AREA },
  back: { ...DEFAULT_PRINTABLE_AREA },
  "left-sleeve": { x: 118, y: 148, width: 90, height: 118 },
  "right-sleeve": { x: 118, y: 148, width: 90, height: 118 },
  sleeve: { x: 118, y: 148, width: 90, height: 118 }
};

const CATEGORY_PRINTABLE_PRESETS = {
  "t-shirt": {
    front: { x: 92, y: 108, width: 146, height: 196 },
    back: { x: 92, y: 108, width: 146, height: 196 },
    "left-sleeve": { x: 118, y: 146, width: 92, height: 118 },
    "right-sleeve": { x: 118, y: 146, width: 92, height: 118 },
    sleeve: { x: 118, y: 146, width: 92, height: 118 }
  },
  hoodie: {
    front: { x: 84, y: 118, width: 162, height: 204 },
    back: { x: 84, y: 118, width: 162, height: 204 },
    sleeve: { x: 112, y: 156, width: 106, height: 128 },
    "left-sleeve": { x: 112, y: 156, width: 106, height: 128 },
    "right-sleeve": { x: 112, y: 156, width: 106, height: 128 }
  },
  "tote-bag": {
    front: { x: 82, y: 88, width: 166, height: 250 },
    back: { x: 82, y: 88, width: 166, height: 250 }
  },
  handkerchief: {
    front: { x: 54, y: 118, width: 222, height: 192 }
  },
  sweatshirt: {
    front: { x: 86, y: 114, width: 158, height: 202 },
    back: { x: 86, y: 114, width: 158, height: 202 },
    "left-sleeve": { x: 114, y: 152, width: 102, height: 126 },
    "right-sleeve": { x: 114, y: 152, width: 102, height: 126 },
    sleeve: { x: 114, y: 152, width: 102, height: 126 }
  },
  "polo-shirt": {
    front: { x: 96, y: 110, width: 140, height: 188 },
    back: { x: 96, y: 110, width: 140, height: 188 },
    "left-sleeve": { x: 122, y: 150, width: 86, height: 108 },
    "right-sleeve": { x: 122, y: 150, width: 86, height: 108 },
    sleeve: { x: 122, y: 150, width: 86, height: 108 }
  },
  jerseys: {
    front: { x: 84, y: 106, width: 162, height: 214 },
    back: { x: 84, y: 106, width: 162, height: 214 },
    "left-sleeve": { x: 116, y: 148, width: 96, height: 118 },
    "right-sleeve": { x: 116, y: 148, width: 96, height: 118 },
    sleeve: { x: 116, y: 148, width: 96, height: 118 }
  },
  "pillow-covers": {
    front: { x: 50, y: 102, width: 230, height: 220 },
    back: { x: 50, y: 102, width: 230, height: 220 }
  },
  cup: {
    front: { x: 94, y: 136, width: 142, height: 128 },
    back: { x: 94, y: 136, width: 142, height: 128 }
  },
  cups: {
    front: { x: 94, y: 136, width: 142, height: 128 },
    back: { x: 94, y: 136, width: 142, height: 128 }
  },
  mug: {
    front: { x: 94, y: 136, width: 142, height: 128 },
    back: { x: 94, y: 136, width: 142, height: 128 }
  },
  keyring: {
    front: { x: 102, y: 128, width: 126, height: 148 },
    back: { x: 102, y: 128, width: 126, height: 148 }
  },
  "key-ring": {
    front: { x: 102, y: 128, width: 126, height: 148 },
    back: { x: 102, y: 128, width: 126, height: 148 }
  }
};

const CATEGORY_ALIASES = {
  tshirt: "t-shirt",
  tshirts: "t-shirt",
  "t-shirts": "t-shirt",
  "t shirt": "t-shirt",
  handkerchiefs: "handkerchief",
  jersey: "jerseys",
  "pillow cover": "pillow-covers",
  "pillow covers": "pillow-covers"
};

export const DEFAULT_CATEGORY_CONFIGS = [
  {
    name: "T-Shirt",
    supportsSizes: true,
    allowedSizes: SIZE_OPTIONS,
    customizationSides: ["Front", "Back", "Left Sleeve", "Right Sleeve"]
  },
  {
    name: "Hoodie",
    supportsSizes: true,
    allowedSizes: SIZE_OPTIONS,
    customizationSides: ["Front", "Back", "Sleeve"]
  },
  {
    name: "Tote Bag",
    supportsSizes: false,
    allowedSizes: [],
    customizationSides: ["Front", "Back"]
  },
  {
    name: "Handkerchief",
    supportsSizes: false,
    allowedSizes: [],
    customizationSides: ["Front"]
  },
  {
    name: "Sweatshirt",
    supportsSizes: true,
    allowedSizes: SIZE_OPTIONS,
    customizationSides: ["Front", "Back", "Left Sleeve", "Right Sleeve"]
  },
  {
    name: "Polo Shirt",
    supportsSizes: true,
    allowedSizes: SIZE_OPTIONS,
    customizationSides: ["Front", "Back", "Left Sleeve", "Right Sleeve"]
  },
  {
    name: "Jerseys",
    supportsSizes: true,
    allowedSizes: SIZE_OPTIONS,
    customizationSides: ["Front", "Back", "Left Sleeve", "Right Sleeve"]
  },
  {
    name: "pillow covers",
    supportsSizes: true,
    allowedSizes: ["16X16", "18X18", "20X20"],
    customizationSides: ["Front", "Back"]
  }
];

const sanitizeToken = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const toDisplayWords = (value) =>
  sanitizeToken(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const normalizeSizeToken = (value) =>
  sanitizeToken(value)
    .toUpperCase()
    .replace(/[^A-Z0-9.\-/ ]+/g, "")
    .trim()
    .slice(0, 24);

export const normalizeSizeList = (sizes) => {
  if (!Array.isArray(sizes)) {
    return [];
  }

  const unique = new Map();

  sizes.forEach((size) => {
    const normalized = normalizeSizeToken(size);
    if (!normalized) {
      return;
    }
    unique.set(normalized, normalized);
  });

  return Array.from(unique.values());
};

export const normalizeSideList = (sides) => {
  if (!Array.isArray(sides)) {
    return [];
  }

  const unique = new Map();

  sides.forEach((side) => {
    const normalized = toDisplayWords(side);
    if (!normalized) {
      return;
    }

    const key = normalized.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, normalized.slice(0, 60));
    }
  });

  return Array.from(unique.values());
};

export const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toSideKey = (value) => toSlug(value);

export const getPrintableAreaPreset = ({ category, side }) => {
  const categorySlug = toSlug(category);
  const sideKey = toSideKey(side);

  const categoryKey = CATEGORY_ALIASES[categorySlug] || categorySlug;
  const categoryPreset = CATEGORY_PRINTABLE_PRESETS[categoryKey] || {};

  if (categoryPreset[sideKey]) {
    return categoryPreset[sideKey];
  }

  if ((sideKey === "left-sleeve" || sideKey === "right-sleeve") && categoryPreset.sleeve) {
    return categoryPreset.sleeve;
  }

  return DEFAULT_SIDE_PRINTABLE_PRESETS[sideKey] || DEFAULT_PRINTABLE_AREA;
};
