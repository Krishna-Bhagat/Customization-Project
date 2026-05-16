export const WORKFLOW_STEPS = [
  "Product",
  "Print Location",
  "Customize",
  "Checkout"
];

export const SIDE_OPTIONS = [
  { key: "front", label: "Front", shortLabel: "Front", previewClass: "" },
  { key: "back", label: "Back", shortLabel: "Back", previewClass: "" },
  { key: "left-sleeve", label: "Left Sleeve", shortLabel: "L Sleeve", previewClass: "-rotate-[4deg]" },
  { key: "right-sleeve", label: "Right Sleeve", shortLabel: "R Sleeve", previewClass: "rotate-[4deg]" },
  { key: "sleeve", label: "Sleeve", shortLabel: "Sleeve", previewClass: "" }
];

export const FONT_OPTIONS = [
  "Sora",
  "Space Grotesk",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Arial"
];

const DEFAULT_PRINT_AREAS = {
  front: { left: 90, top: 108, width: 150, height: 198 },
  back: { left: 90, top: 108, width: 150, height: 198 },
  "left-sleeve": { left: 118, top: 148, width: 90, height: 118 },
  "right-sleeve": { left: 118, top: 148, width: 90, height: 118 },
  sleeve: { left: 118, top: 148, width: 90, height: 118 }
};

const CATEGORY_PRINT_AREAS = {
  "t shirt": {
    front: { left: 92, top: 108, width: 146, height: 196 },
    back: { left: 92, top: 108, width: 146, height: 196 },
    "left-sleeve": { left: 118, top: 146, width: 92, height: 118 },
    "right-sleeve": { left: 118, top: 146, width: 92, height: 118 },
    sleeve: { left: 118, top: 146, width: 92, height: 118 }
  },
  hoodie: {
    front: { left: 84, top: 118, width: 162, height: 204 },
    back: { left: 84, top: 118, width: 162, height: 204 },
    sleeve: { left: 112, top: 156, width: 106, height: 128 },
    "left-sleeve": { left: 112, top: 156, width: 106, height: 128 },
    "right-sleeve": { left: 112, top: 156, width: 106, height: 128 }
  },
  "tote bag": {
    front: { left: 82, top: 88, width: 166, height: 250 },
    back: { left: 82, top: 88, width: 166, height: 250 }
  },
  handkerchief: {
    front: { left: 54, top: 118, width: 222, height: 192 }
  },
  sweatshirt: {
    front: { left: 86, top: 114, width: 158, height: 202 },
    back: { left: 86, top: 114, width: 158, height: 202 },
    "left-sleeve": { left: 114, top: 152, width: 102, height: 126 },
    "right-sleeve": { left: 114, top: 152, width: 102, height: 126 },
    sleeve: { left: 114, top: 152, width: 102, height: 126 }
  },
  "polo shirt": {
    front: { left: 96, top: 110, width: 140, height: 188 },
    back: { left: 96, top: 110, width: 140, height: 188 },
    "left-sleeve": { left: 122, top: 150, width: 86, height: 108 },
    "right-sleeve": { left: 122, top: 150, width: 86, height: 108 },
    sleeve: { left: 122, top: 150, width: 86, height: 108 }
  },
  jerseys: {
    front: { left: 84, top: 106, width: 162, height: 214 },
    back: { left: 84, top: 106, width: 162, height: 214 },
    "left-sleeve": { left: 116, top: 148, width: 96, height: 118 },
    "right-sleeve": { left: 116, top: 148, width: 96, height: 118 },
    sleeve: { left: 116, top: 148, width: 96, height: 118 }
  },
  handkershiefs: {
    front: { left: 54, top: 118, width: 222, height: 192 }
  },
  "pillow covers": {
    front: { left: 50, top: 102, width: 230, height: 220 },
    back: { left: 50, top: 102, width: 230, height: 220 }
  },
  cup: {
    front: { left: 94, top: 136, width: 142, height: 128 },
    back: { left: 94, top: 136, width: 142, height: 128 }
  },
  cups: {
    front: { left: 94, top: 136, width: 142, height: 128 },
    back: { left: 94, top: 136, width: 142, height: 128 }
  },
  mug: {
    front: { left: 94, top: 136, width: 142, height: 128 },
    back: { left: 94, top: 136, width: 142, height: 128 }
  },
  keyring: {
    front: { left: 102, top: 128, width: 126, height: 148 },
    back: { left: 102, top: 128, width: 126, height: 148 }
  },
  "key ring": {
    front: { left: 102, top: 128, width: 126, height: 148 },
    back: { left: 102, top: 128, width: 126, height: 148 }
  }
};

const CATEGORY_ALIASES = {
  tshirt: "t shirt",
  "t-shirt": "t shirt",
  tshirts: "t shirt",
  "t-shirts": "t shirt",
  handkerchiefs: "handkerchief",
  jersey: "jerseys",
  "pillow cover": "pillow covers",
  handkerschief: "handkershiefs",
  handkerschiefs: "handkershiefs"
};

const normalizeCategoryKey = (category) =>
  String(category || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const normalizeSideKey = (sideKey) =>
  String(sideKey || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^leftsleeve$/, "left-sleeve")
    .replace(/^rightsleeve$/, "right-sleeve");

export const getPrintableArea = (category, sideKey) => {
  const rawKey = normalizeCategoryKey(category);
  const categoryKey = CATEGORY_ALIASES[rawKey] || rawKey;
  const normalizedSideKey = normalizeSideKey(sideKey);
  const categoryAreas = CATEGORY_PRINT_AREAS[categoryKey] || DEFAULT_PRINT_AREAS;

  if (categoryAreas[normalizedSideKey]) {
    return categoryAreas[normalizedSideKey];
  }

  if (
    (normalizedSideKey === "left-sleeve" || normalizedSideKey === "right-sleeve") &&
    categoryAreas.sleeve
  ) {
    return categoryAreas.sleeve;
  }

  return DEFAULT_PRINT_AREAS[normalizedSideKey] || DEFAULT_PRINT_AREAS.front;
};

export const CANVAS_DIMENSIONS = {
  width: 330,
  height: 430
};

export const CUSTOMIZER_HISTORY_LIMIT = 60;
