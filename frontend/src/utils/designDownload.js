const loadImage = (url) =>
  new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Missing image source"));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });

const sanitizeFileToken = (value, fallback = "design") => {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return token || fallback;
};

export const triggerDownload = (dataUrl, fileName) => {
  if (!dataUrl) {
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const composeMockupPreview = async ({
  mockupUrl,
  designUrl,
  printableArea,
  canvasWidth = 330,
  canvasHeight = 430,
  multiplier = 3,
  format = "png",
  quality = 0.82
}) => {
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = Math.max(1, Math.round(canvasWidth * multiplier));
  targetCanvas.height = Math.max(1, Math.round(canvasHeight * multiplier));

  const context = targetCanvas.getContext("2d");
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  if (mockupUrl) {
    const mockup = await loadImage(mockupUrl);
    context.drawImage(mockup, 0, 0, targetCanvas.width, targetCanvas.height);
  }

  if (designUrl) {
    const designImage = await loadImage(designUrl);
    const area = printableArea || {
      left: 0,
      top: 0,
      width: canvasWidth,
      height: canvasHeight
    };

    context.drawImage(
      designImage,
      Math.round(area.left * multiplier),
      Math.round(area.top * multiplier),
      Math.max(1, Math.round(area.width * multiplier)),
      Math.max(1, Math.round(area.height * multiplier))
    );
  }

  const normalizedFormat = String(format || "png").toLowerCase();
  const mimeType =
    normalizedFormat === "webp"
      ? "image/webp"
      : normalizedFormat === "jpeg" || normalizedFormat === "jpg"
        ? "image/jpeg"
        : "image/png";

  if (mimeType === "image/png") {
    return targetCanvas.toDataURL(mimeType);
  }

  return targetCanvas.toDataURL(mimeType, Math.min(Math.max(Number(quality) || 0.82, 0.4), 1));
};

export const buildDesignFileName = ({ productName, sideLabel }) => {
  const safeProduct = sanitizeFileToken(productName, "product");
  const safeSide = sanitizeFileToken(sideLabel, "side");
  return `${safeProduct}-${safeSide}.png`;
};
