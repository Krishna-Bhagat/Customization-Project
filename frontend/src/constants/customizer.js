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

export const getPrintableArea = (_category, sideKey) => {
  const normalizedSideKey = normalizeSideKey(sideKey);
  if (DEFAULT_PRINT_AREAS[normalizedSideKey]) {
    return DEFAULT_PRINT_AREAS[normalizedSideKey];
  }

  if (
    (normalizedSideKey === "left-sleeve" || normalizedSideKey === "right-sleeve")
  ) {
    return DEFAULT_PRINT_AREAS.sleeve;
  }

  return DEFAULT_PRINT_AREAS[normalizedSideKey] || DEFAULT_PRINT_AREAS.front;
};

export const CANVAS_DIMENSIONS = {
  width: 330,
  height: 430
};

export const CUSTOMIZER_HISTORY_LIMIT = 60;
