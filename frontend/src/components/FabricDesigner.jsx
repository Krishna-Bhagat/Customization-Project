import { AnimatePresence, motion } from "framer-motion";
import { fabric } from "fabric";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CANVAS_DIMENSIONS,
  CUSTOMIZER_HISTORY_LIMIT,
  FONT_OPTIONS,
  getPrintableArea,
  normalizeSideKey
} from "../constants/customizer.js";

const buildFallbackMockup = (category) => {
  const label = encodeURIComponent(String(category || "Custom Product").toUpperCase());
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 330 430'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#dbeafe'/>
        <stop offset='100%' stop-color='#f1f5f9'/>
      </linearGradient>
    </defs>
    <rect width='330' height='430' rx='24' fill='url(#bg)'/>
    <rect x='44' y='64' width='242' height='300' rx='28' fill='#f8fafc' stroke='#cbd5e1' stroke-width='3'/>
    <text x='165' y='42' fill='#0f172a' text-anchor='middle' font-size='16' font-family='Arial' font-weight='700'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const normalizePrintableArea = (area, category, sideKey) => {
  const fallback = getPrintableArea(category, sideKey);
  if (!area || typeof area !== "object") {
    return fallback;
  }

  const left = Number(area.left ?? area.x);
  const top = Number(area.top ?? area.y);
  const width = Number(area.width);
  const height = Number(area.height);

  return {
    left: Number.isFinite(left) ? left : fallback.left,
    top: Number.isFinite(top) ? top : fallback.top,
    width: Number.isFinite(width) ? width : fallback.width,
    height: Number.isFinite(height) ? height : fallback.height
  };
};

const getObjectLabel = (object, index) => {
  if (!object) {
    return `Layer ${index + 1}`;
  }

  if (object.type === "textbox") {
    const preview = String(object.text || "Text").trim();
    return preview ? `Text: ${preview.slice(0, 20)}` : "Text";
  }

  if (object.type === "image") {
    return `Image ${index + 1}`;
  }

  return `Object ${index + 1}`;
};

const ToolbarIcon = ({ type }) => {
  if (type === "upload") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 18v2h16v-2" />
      </svg>
    );
  }

  if (type === "text") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16" />
        <path d="M12 6v12" />
      </svg>
    );
  }

  if (type === "layers") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
    );
  }

  if (type === "product") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 9h8" />
      </svg>
    );
  }

  if (type === "undo") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h9a7 7 0 1 1 0 14h-2" />
      </svg>
    );
  }

  if (type === "redo") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m15 14 5-5-5-5" />
        <path d="M20 9h-9a7 7 0 1 0 0 14h2" />
      </svg>
    );
  }

  return null;
};

const FabricDesigner = ({
  productImage,
  productImages = [],
  category,
  sideOptions = [],
  initialSide,
  initialCanvasStates,
  onNotify,
  onOpenProductPanel,
  onSave,
  onProceedCheckout
}) => {
  const normalizedSideOptions = useMemo(() => {
    const incoming = Array.isArray(sideOptions) ? sideOptions : [];
    const deduped = [];
    const seen = new Set();

    incoming.forEach((option) => {
      const key = normalizeSideKey(option?.key || option?.sideKey || option?.label || option?.sideName);
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      deduped.push({
        key,
        label: option?.label || option?.sideName || "Side",
        shortLabel: option?.shortLabel || option?.label || option?.sideName || "Side",
        previewClass: option?.previewClass || "",
        mockupImage: option?.mockupImage || "",
        printableArea: normalizePrintableArea(option?.printableArea, category, key)
      });
    });

    if (deduped.length > 0) {
      return deduped;
    }

    return [{ key: "front", label: "Front", shortLabel: "Front", mockupImage: "", printableArea: getPrintableArea(category, "front"), previewClass: "" }];
  }, [category, sideOptions]);

  const sideOptionsByKey = useMemo(
    () =>
      normalizedSideOptions.reduce((acc, side) => {
        acc[side.key] = side;
        return acc;
      }, {}),
    [normalizedSideOptions]
  );

  const availableSides = useMemo(
    () => normalizedSideOptions.map((option) => option.key),
    [normalizedSideOptions]
  );

  const sideLabels = useMemo(
    () =>
      normalizedSideOptions.reduce((acc, side) => {
        acc[side.key] = side.shortLabel || side.label || side.key;
        return acc;
      }, {}),
    [normalizedSideOptions]
  );

  const [activeSide, setActiveSide] = useState(() => {
    const normalizedInitialSide = normalizeSideKey(initialSide);
    return availableSides.includes(normalizedInitialSide) ? normalizedInitialSide : availableSides[0];
  });
  const [isTextDrawerOpen, setIsTextDrawerOpen] = useState(false);
  const [isLayersDrawerOpen, setIsLayersDrawerOpen] = useState(false);
  const [textValue, setTextValue] = useState("Gift vibes");
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0]);
  const [fontColor, setFontColor] = useState("#0f172a");
  const [fontSize, setFontSize] = useState(34);
  const [historyStamp, setHistoryStamp] = useState(0);
  const [layerStamp, setLayerStamp] = useState(0);
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false });

  const fileInputRef = useRef(null);
  const stageViewportRef = useRef(null);
  const canvasElementsRef = useRef({});
  const canvasInstancesRef = useRef({});
  const historyRef = useRef({});
  const isRestoringRef = useRef({});
  const [stageScale, setStageScale] = useState(1);

  const resolvedMockupImages = useMemo(() => {
    if (Array.isArray(productImages) && productImages.length > 0) {
      return productImages;
    }
    return productImage ? [productImage] : [buildFallbackMockup(category)];
  }, [category, productImage, productImages]);

  const getMockupForSide = useCallback(
    (side) => {
      const normalizedSide = normalizeSideKey(side);
      const sideOptionImage = sideOptionsByKey[normalizedSide]?.mockupImage;

      if (sideOptionImage) {
        return sideOptionImage;
      }

      if (normalizedSide === "front") {
        return resolvedMockupImages[0] || resolvedMockupImages[1] || resolvedMockupImages[2];
      }

      if (normalizedSide === "back") {
        return resolvedMockupImages[1] || resolvedMockupImages[0] || resolvedMockupImages[2];
      }

      return resolvedMockupImages[2] || resolvedMockupImages[0] || resolvedMockupImages[1];
    },
    [resolvedMockupImages, sideOptionsByKey]
  );

  const getMockupClassForSide = useCallback(
    (side) => {
      const normalizedSide = normalizeSideKey(side);
      const configuredClass = sideOptionsByKey[normalizedSide]?.previewClass;
      if (configuredClass) {
        return configuredClass;
      }

      if (normalizedSide === "left-sleeve") {
        return "-rotate-[2deg]";
      }

      if (normalizedSide === "right-sleeve") {
        return "rotate-[2deg]";
      }

      return "";
    },
    [sideOptionsByKey]
  );

  const getCanvas = useCallback((side) => canvasInstancesRef.current[side], []);

  const getAreaForSide = useCallback(
    (side) => {
      const normalizedSide = normalizeSideKey(side);
      return (
        sideOptionsByKey[normalizedSide]?.printableArea ||
        getPrintableArea(category, normalizedSide)
      );
    },
    [category, sideOptionsByKey]
  );

  const ensureHistory = useCallback((side) => {
    if (!historyRef.current[side]) {
      historyRef.current[side] = {
        stack: [],
        index: -1
      };
    }
    return historyRef.current[side];
  }, []);

  const applyCanvasFrame = useCallback(
    (canvas, side) => {
      const area = getAreaForSide(side);
      canvas.setWidth(CANVAS_DIMENSIONS.width);
      canvas.setHeight(CANVAS_DIMENSIONS.height);
      canvas.clipPath = new fabric.Rect({
        left: area.left,
        top: area.top,
        width: area.width,
        height: area.height,
        absolutePositioned: true
      });
      canvas.requestRenderAll();
    },
    [getAreaForSide]
  );

  const snapshotCanvas = useCallback((canvas) => JSON.stringify(canvas.toDatalessJSON()), []);

  const pushHistory = useCallback(
    (side, { force = false } = {}) => {
      const canvas = getCanvas(side);
      if (!canvas) {
        return;
      }

      const history = ensureHistory(side);
      const snapshot = snapshotCanvas(canvas);

      if (!force && history.index >= 0 && history.stack[history.index] === snapshot) {
        return;
      }

      history.stack = history.stack.slice(0, history.index + 1);
      history.stack.push(snapshot);

      if (history.stack.length > CUSTOMIZER_HISTORY_LIMIT) {
        history.stack.shift();
      }

      history.index = history.stack.length - 1;
      setHistoryStamp((prev) => prev + 1);
      setLayerStamp((prev) => prev + 1);
    },
    [ensureHistory, getCanvas, snapshotCanvas]
  );

  const clampObjectToArea = useCallback(
    (object, canvas, side, { withSnap = false } = {}) => {
      if (!object || !canvas) {
        return;
      }

      const area = getAreaForSide(side);
      const minObjectPixels = 18;

      const initialBounds = object.getBoundingRect(true, true);

      if (initialBounds.width > area.width || initialBounds.height > area.height) {
        const widthScale = area.width / Math.max(initialBounds.width, 1);
        const heightScale = area.height / Math.max(initialBounds.height, 1);
        const scaleFactor = Math.min(widthScale, heightScale, 1);
        object.scaleX *= scaleFactor;
        object.scaleY *= scaleFactor;
        object.setCoords();
      }

      const postScaleBounds = object.getBoundingRect(true, true);
      if (postScaleBounds.width < minObjectPixels || postScaleBounds.height < minObjectPixels) {
        const widthScale = minObjectPixels / Math.max(postScaleBounds.width, 1);
        const heightScale = minObjectPixels / Math.max(postScaleBounds.height, 1);
        const scaleFactor = Math.max(widthScale, heightScale);
        object.scaleX *= scaleFactor;
        object.scaleY *= scaleFactor;
        object.setCoords();
      }

      let bounds = object.getBoundingRect(true, true);
      let nextLeft = object.left;
      let nextTop = object.top;

      if (bounds.left < area.left) {
        nextLeft += area.left - bounds.left;
      }

      if (bounds.top < area.top) {
        nextTop += area.top - bounds.top;
      }

      if (bounds.left + bounds.width > area.left + area.width) {
        nextLeft -= bounds.left + bounds.width - (area.left + area.width);
      }

      if (bounds.top + bounds.height > area.top + area.height) {
        nextTop -= bounds.top + bounds.height - (area.top + area.height);
      }

      object.set({ left: nextLeft, top: nextTop });
      object.setCoords();

      let snapX = false;
      let snapY = false;

      if (withSnap) {
        const threshold = 8;
        const centerX = area.left + area.width / 2;
        const centerY = area.top + area.height / 2;
        const objectCenter = object.getCenterPoint();

        if (Math.abs(objectCenter.x - centerX) <= threshold) {
          object.left += centerX - objectCenter.x;
          snapX = true;
        }

        if (Math.abs(objectCenter.y - centerY) <= threshold) {
          object.top += centerY - objectCenter.y;
          snapY = true;
        }

        object.setCoords();
      }

      setSnapGuide({ x: snapX, y: snapY });
      canvas.requestRenderAll();
    },
    [getAreaForSide]
  );

  const applyInteractiveDefaults = useCallback((object) => {
    if (!object) {
      return;
    }

    object.set({
      transparentCorners: false,
      cornerStyle: "circle",
      cornerSize: 12,
      cornerColor: "#0f766e",
      cornerStrokeColor: "#ffffff",
      borderColor: "#0f766e",
      borderDashArray: [4, 4],
      lockUniScaling: false,
      objectCaching: false
    });

    if (typeof object.setControlsVisibility === "function") {
      object.setControlsVisibility({
        mt: true,
        mb: true,
        ml: true,
        mr: true,
        tl: true,
        tr: true,
        bl: true,
        br: true,
        mtr: true
      });
    }
  }, []);

  const restoreFromSnapshot = useCallback(
    (side, snapshot) => {
      const canvas = getCanvas(side);
      if (!canvas) {
        return;
      }

      isRestoringRef.current[side] = true;

      canvas.loadFromJSON(snapshot, () => {
        applyCanvasFrame(canvas, side);
        canvas.getObjects().forEach((object) => {
          applyInteractiveDefaults(object);
          object.setCoords();
        });
        canvas.renderAll();
        isRestoringRef.current[side] = false;
        setLayerStamp((prev) => prev + 1);
        setHistoryStamp((prev) => prev + 1);
      });
    },
    [applyCanvasFrame, applyInteractiveDefaults, getCanvas]
  );

  useEffect(() => {
    availableSides.forEach((side) => {
      const element = canvasElementsRef.current[side];
      if (!element || canvasInstancesRef.current[side]) {
        return;
      }

      const canvas = new fabric.Canvas(element, {
        width: CANVAS_DIMENSIONS.width,
        height: CANVAS_DIMENSIONS.height,
        preserveObjectStacking: true,
        stopContextMenu: true
      });

      applyCanvasFrame(canvas, side);

      canvas.on("object:moving", (event) => {
        if (event.target) {
          clampObjectToArea(event.target, canvas, side, { withSnap: true });
        }
      });

      canvas.on("object:scaling", (event) => {
        if (event.target) {
          clampObjectToArea(event.target, canvas, side, { withSnap: true });
        }
      });

      canvas.on("object:rotating", (event) => {
        if (event.target) {
          clampObjectToArea(event.target, canvas, side, { withSnap: false });
        }
      });

      canvas.on("mouse:up", () => {
        setSnapGuide({ x: false, y: false });
      });

      canvas.on("object:added", (event) => {
        if (event?.target) {
          applyInteractiveDefaults(event.target);
          event.target.setCoords();
        }
        if (isRestoringRef.current[side]) {
          return;
        }
        pushHistory(side);
      });

      canvas.on("object:modified", (event) => {
        if (event.target) {
          clampObjectToArea(event.target, canvas, side, { withSnap: false });
        }
        if (isRestoringRef.current[side]) {
          return;
        }
        pushHistory(side);
      });

      canvas.on("object:removed", () => {
        if (isRestoringRef.current[side]) {
          return;
        }
        pushHistory(side);
      });

      canvasInstancesRef.current[side] = canvas;

      const incomingSnapshot = initialCanvasStates?.[side];
      if (incomingSnapshot) {
        restoreFromSnapshot(side, incomingSnapshot);
        window.setTimeout(() => pushHistory(side, { force: true }), 120);
      } else {
        pushHistory(side, { force: true });
      }
    });

    Object.keys(canvasInstancesRef.current).forEach((side) => {
      if (availableSides.includes(side)) {
        return;
      }

      canvasInstancesRef.current[side]?.dispose();
      delete canvasInstancesRef.current[side];
      delete historyRef.current[side];
    });
  }, [
    applyCanvasFrame,
    applyInteractiveDefaults,
    availableSides,
    clampObjectToArea,
    initialCanvasStates,
    pushHistory,
    restoreFromSnapshot
  ]);

  useEffect(() => {
    return () => {
      Object.values(canvasInstancesRef.current).forEach((canvas) => canvas?.dispose());
      canvasInstancesRef.current = {};
      historyRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!availableSides.includes(activeSide)) {
      setActiveSide(availableSides[0]);
    }
  }, [activeSide, availableSides]);

  useEffect(() => {
    const stageNode = stageViewportRef.current;
    if (!stageNode) {
      return undefined;
    }

    const updateScale = () => {
      const availableWidth = stageNode.clientWidth;
      if (!availableWidth) {
        return;
      }

      setStageScale(Math.min(1, availableWidth / CANVAS_DIMENSIONS.width));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(stageNode);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = getCanvas(activeSide);
    if (!canvas) {
      return;
    }

    applyCanvasFrame(canvas, activeSide);
    canvas.discardActiveObject();
    canvas.calcOffset();
    canvas.requestRenderAll();
    setSnapGuide({ x: false, y: false });
  }, [activeSide, applyCanvasFrame, getCanvas]);

  useEffect(() => {
    availableSides.forEach((side) => {
      const canvas = getCanvas(side);
      if (!canvas) {
        return;
      }
      canvas.calcOffset();
      canvas.requestRenderAll();
    });
  }, [availableSides, getCanvas, stageScale]);

  const canUndo = useMemo(() => {
    const history = historyRef.current[activeSide];
    return Boolean(history && history.index > 0);
  }, [activeSide, historyStamp]);

  const canRedo = useMemo(() => {
    const history = historyRef.current[activeSide];
    return Boolean(history && history.index < history.stack.length - 1);
  }, [activeSide, historyStamp]);

  const layers = useMemo(() => {
    const canvas = getCanvas(activeSide);
    if (!canvas) {
      return [];
    }

    return canvas
      .getObjects()
      .map((object, index) => ({
        object,
        originalIndex: index,
        label: getObjectLabel(object, index)
      }))
      .reverse();
  }, [activeSide, getCanvas, layerStamp]);

  const addTextToCanvas = () => {
    const canvas = getCanvas(activeSide);
    if (!canvas) {
      return;
    }

    const trimmed = String(textValue || "").trim();
    if (!trimmed) {
      onNotify?.({ type: "error", message: "Enter text before adding it to design." });
      return;
    }

    const area = getAreaForSide(activeSide);
    const textWidth = Math.min(Math.max(130, area.width * 0.65), area.width);
    const textObject = new fabric.IText(trimmed, {
      left: area.left + (area.width - textWidth) / 2,
      top: area.top + area.height / 2 - Number(fontSize) * 0.6,
      width: textWidth,
      fontFamily,
      fill: fontColor,
      fontSize: Number(fontSize),
      editable: true,
      originX: "left",
      originY: "top"
    });

    applyInteractiveDefaults(textObject);
    canvas.add(textObject);
    canvas.bringToFront(textObject);
    canvas.setActiveObject(textObject);
    clampObjectToArea(textObject, canvas, activeSide, { withSnap: false });
    canvas.requestRenderAll();
    setIsTextDrawerOpen(false);
  };

  const uploadImageToCanvas = (event) => {
    const file = event.target.files?.[0];
    const canvas = getCanvas(activeSide);

    if (!file || !canvas) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result, (imageObject) => {
        if (!imageObject) {
          onNotify?.({ type: "error", message: "Unable to load this image. Please try another file." });
          return;
        }

        const area = getAreaForSide(activeSide);
        const maxWidth = area.width * 0.8;
        const maxHeight = area.height * 0.8;

        const widthScale = maxWidth / Math.max(imageObject.width || 1, 1);
        const heightScale = maxHeight / Math.max(imageObject.height || 1, 1);
        const scale = Math.min(widthScale, heightScale, 1);
        const renderWidth = (imageObject.width || 1) * scale;
        const renderHeight = (imageObject.height || 1) * scale;

        imageObject.set({
          left: area.left + (area.width - renderWidth) / 2,
          top: area.top + (area.height - renderHeight) / 2,
          angle: 0,
          originX: "left",
          originY: "top"
        });

        imageObject.scale(scale);
        applyInteractiveDefaults(imageObject);
        canvas.add(imageObject);
        canvas.bringToFront(imageObject);
        canvas.setActiveObject(imageObject);
        clampObjectToArea(imageObject, canvas, activeSide, { withSnap: false });
        canvas.requestRenderAll();
      }, { crossOrigin: "anonymous" });
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const runUndo = () => {
    const history = historyRef.current[activeSide];
    if (!history || history.index <= 0) {
      onNotify?.({ type: "info", message: "Nothing left to undo." });
      return;
    }

    history.index -= 1;
    restoreFromSnapshot(activeSide, history.stack[history.index]);
  };

  const runRedo = () => {
    const history = historyRef.current[activeSide];
    if (!history || history.index >= history.stack.length - 1) {
      onNotify?.({ type: "info", message: "Nothing left to redo." });
      return;
    }

    history.index += 1;
    restoreFromSnapshot(activeSide, history.stack[history.index]);
  };

  const selectLayer = (originalIndex) => {
    const canvas = getCanvas(activeSide);
    if (!canvas) {
      return;
    }

    const target = canvas.getObjects()[originalIndex];
    if (!target) {
      return;
    }

    canvas.setActiveObject(target);
    canvas.requestRenderAll();
  };

  const bringSelectedForward = () => {
    const canvas = getCanvas(activeSide);
    const activeObject = canvas?.getActiveObject();

    if (!canvas || !activeObject) {
      onNotify?.({ type: "info", message: "Select an object from canvas first." });
      return;
    }

    canvas.bringForward(activeObject);
    canvas.requestRenderAll();
    pushHistory(activeSide);
    setLayerStamp((prev) => prev + 1);
  };

  const sendSelectedBackward = () => {
    const canvas = getCanvas(activeSide);
    const activeObject = canvas?.getActiveObject();

    if (!canvas || !activeObject) {
      onNotify?.({ type: "info", message: "Select an object from canvas first." });
      return;
    }

    canvas.sendBackwards(activeObject);
    canvas.requestRenderAll();
    pushHistory(activeSide);
    setLayerStamp((prev) => prev + 1);
  };

  const deleteSelectedLayer = () => {
    const canvas = getCanvas(activeSide);
    const activeObject = canvas?.getActiveObject();

    if (!canvas || !activeObject) {
      onNotify?.({ type: "info", message: "Select an object to delete." });
      return;
    }

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setLayerStamp((prev) => prev + 1);
  };

  const exportSide = useCallback(
    (side) => {
      const canvas = getCanvas(side);
      if (!canvas) {
        return "";
      }

      const area = getAreaForSide(side);
      canvas.discardActiveObject();
      canvas.requestRenderAll();

      return canvas.toDataURL({
        format: "png",
        left: area.left,
        top: area.top,
        width: area.width,
        height: area.height,
        multiplier: 2
      });
    },
    [getAreaForSide, getCanvas]
  );

  const collectCanvasState = useCallback(() => {
    const canvasStates = {};

    availableSides.forEach((side) => {
      const canvas = getCanvas(side);
      if (canvas) {
        canvasStates[side] = snapshotCanvas(canvas);
      }
    });

    const designExports = {};
    availableSides.forEach((sideKey) => {
      designExports[sideKey] = exportSide(sideKey);
    });

    const hasAnyDesign = availableSides.some((side) => {
      const canvas = getCanvas(side);
      return (canvas?.getObjects().length || 0) > 0;
    });

    return {
      activeSide,
      canvasStates,
      designExports,
      hasAnyDesign
    };
  }, [activeSide, availableSides, exportSide, getCanvas, snapshotCanvas]);

  const handleSave = () => {
    const payload = collectCanvasState();
    onSave?.(payload);
    onNotify?.({ type: "success", message: "Design saved successfully." });
  };

  const handleProceedCheckout = () => {
    const payload = collectCanvasState();
    if (!payload.hasAnyDesign) {
      onNotify?.({ type: "error", message: "Add at least one design element before checkout." });
      return;
    }
    onSave?.(payload);
    onProceedCheckout?.(payload);
  };

  const toolbarButtons = [
    {
      key: "upload",
      label: "Upload",
      icon: "upload",
      onClick: () => fileInputRef.current?.click()
    },
    {
      key: "text",
      label: "Text",
      icon: "text",
      onClick: () => {
        setIsLayersDrawerOpen(false);
        setIsTextDrawerOpen(true);
      }
    },
    {
      key: "layers",
      label: "Layers",
      icon: "layers",
      onClick: () => {
        setIsTextDrawerOpen(false);
        setIsLayersDrawerOpen((prev) => !prev);
      }
    },
    {
      key: "product",
      label: "Product",
      icon: "product",
      onClick: () => {
        if (onOpenProductPanel) {
          onOpenProductPanel();
          return;
        }
        onNotify?.({ type: "info", message: "Product panel is unavailable." });
      }
    },
    {
      key: "undo",
      label: "Undo",
      icon: "undo",
      onClick: runUndo
    }
  ];

  const activeArea = getAreaForSide(activeSide);

  return (
    <section className="space-y-3 overflow-x-hidden pb-52">
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={uploadImageToCanvas}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-soft sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={getMockupForSide(activeSide)}
                alt="Product preview"
                className={`h-full w-full object-contain ${getMockupClassForSide(activeSide)}`}
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Customizer</p>
              <h3 className="font-heading text-lg font-semibold text-slate-900">{sideLabels[activeSide]}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runUndo}
              disabled={!canUndo}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ToolbarIcon type="undo" />
            </button>
            <button
              type="button"
              onClick={runRedo}
              disabled={!canRedo}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ToolbarIcon type="redo" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {availableSides.map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setActiveSide(side)}
              className={`inline-flex min-h-10 flex-shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-semibold uppercase tracking-[0.09em] transition ${
                activeSide === side
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {sideLabels[side]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-soft sm:p-4">
        <div ref={stageViewportRef} className="mx-auto w-full max-w-[330px] rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 p-2 shadow-inner">
          <div
            className="mx-auto"
            style={{
              width: CANVAS_DIMENSIONS.width * stageScale,
              height: CANVAS_DIMENSIONS.height * stageScale
            }}
          >
            <div
              className="relative origin-top-left overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_40%_20%,#f8fafc_0%,#eef2f7_48%,#e2e8f0_100%)]"
              style={{
                width: CANVAS_DIMENSIONS.width,
                height: CANVAS_DIMENSIONS.height,
                transform: `scale(${stageScale})`
              }}
            >
              <img
                src={getMockupForSide(activeSide)}
                alt={`${category || "Product"} mockup`}
                className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${getMockupClassForSide(activeSide)}`}
                loading="lazy"
              />

              <div
                className="pointer-events-none absolute rounded-xl border border-dashed border-brand-500/65 bg-brand-200/16 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32)]"
                style={{
                  left: activeArea.left,
                  top: activeArea.top,
                  width: activeArea.width,
                  height: activeArea.height
                }}
              />

              <div
                className="pointer-events-none absolute rounded-xl border border-white/35"
                style={{
                  left: activeArea.left + 8,
                  top: activeArea.top + 8,
                  width: Math.max(activeArea.width - 16, 8),
                  height: Math.max(activeArea.height - 16, 8)
                }}
              />

              <div
                className="pointer-events-none absolute bg-brand-500/35"
                style={{
                  left: activeArea.left + activeArea.width / 2,
                  top: activeArea.top,
                  width: 1,
                  height: activeArea.height,
                  opacity: snapGuide.x ? 1 : 0.28
                }}
              />

              <div
                className="pointer-events-none absolute bg-brand-500/35"
                style={{
                  left: activeArea.left,
                  top: activeArea.top + activeArea.height / 2,
                  width: activeArea.width,
                  height: 1,
                  opacity: snapGuide.y ? 1 : 0.28
                }}
              />

              {availableSides.map((side) => (
                <canvas
                  key={side}
                  ref={(element) => {
                    canvasElementsRef.current[side] = element;
                  }}
                  className={`absolute inset-0 transition-opacity ${
                    activeSide === side
                      ? "z-20 opacity-100"
                      : "pointer-events-none z-0 opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-slate-500">
          Objects are auto-restricted to printable area and snap near center guides.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/97 backdrop-blur">
        <div className="mx-auto w-full max-w-xl px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2">
          <div className="grid grid-cols-5 gap-2">
            {toolbarButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                onClick={button.onClick}
                className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
              >
                <ToolbarIcon type={button.icon} />
                <span className="mt-1">{button.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleProceedCheckout}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Review
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isTextDrawerOpen ? (
              <motion.div
                key="text-sheet"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.22 }}
                className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Add Text</p>
                <input
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
                  placeholder="Type your message"
                />

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={fontFamily}
                    onChange={(event) => setFontFamily(event.target.value)}
                    className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>

                  <input
                    type="color"
                    value={fontColor}
                    onChange={(event) => setFontColor(event.target.value)}
                    className="h-11 rounded-xl border border-slate-300 p-1"
                  />
                </div>

                <label className="mt-2 block text-xs font-semibold text-slate-600">
                  Font Size: {fontSize}px
                  <input
                    type="range"
                    min={14}
                    max={92}
                    value={fontSize}
                    onChange={(event) => setFontSize(Number(event.target.value))}
                    className="mt-1 w-full"
                  />
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={addTextToCanvas}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Add to Design
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTextDrawerOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            ) : null}

            {isLayersDrawerOpen ? (
              <motion.div
                key="layers-sheet"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2 }}
                className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Layers</p>
                  <button
                    type="button"
                    onClick={() => setIsLayersDrawerOpen(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                  {layers.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      No objects yet.
                    </div>
                  ) : (
                    layers.map((layer) => (
                      <button
                        key={`${layer.label}-${layer.originalIndex}`}
                        type="button"
                        onClick={() => selectLayer(layer.originalIndex)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        {layer.label}
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={bringSelectedForward}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={sendSelectedBackward}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedLayer}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default FabricDesigner;
