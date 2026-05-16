import { useEffect, useMemo, useRef, useState } from "react";

const STAGE_WIDTH = 330;
const STAGE_HEIGHT = 430;
const MIN_PRINTABLE_SIZE = 24;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeArea = (area) => {
  const safeWidth = clamp(Number(area?.width || 0), MIN_PRINTABLE_SIZE, STAGE_WIDTH);
  const safeHeight = clamp(Number(area?.height || 0), MIN_PRINTABLE_SIZE, STAGE_HEIGHT);
  const safeLeft = clamp(Number(area?.x || 0), 0, STAGE_WIDTH - safeWidth);
  const safeTop = clamp(Number(area?.y || 0), 0, STAGE_HEIGHT - safeHeight);

  return {
    x: Math.round(safeLeft),
    y: Math.round(safeTop),
    width: Math.round(safeWidth),
    height: Math.round(safeHeight)
  };
};

const PrintableAreaSelector = ({ file, imageUrl, area, onChange }) => {
  const frameRef = useRef(null);
  const interactionRef = useRef(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [zoom, setZoom] = useState(1);

  const previewUrl = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }
    return imageUrl || "";
  }, [file, imageUrl]);

  useEffect(() => {
    return () => {
      if (file && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, previewUrl]);

  const readPointerCoordinates = (event) => {
    const frame = frameRef.current;
    if (!frame) {
      return { x: 0, y: 0 };
    }

    const rect = frame.getBoundingClientRect();
    const scaleX = STAGE_WIDTH / Math.max(rect.width, 1);
    const scaleY = STAGE_HEIGHT / Math.max(rect.height, 1);

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const updateArea = (nextArea) => {
    onChange(normalizeArea(nextArea));
  };

  const handlePointerDown = (event, actionType, corner = "") => {
    if (!file) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const point = readPointerCoordinates(event);
    interactionRef.current = {
      actionType,
      corner,
      startX: point.x,
      startY: point.y,
      startArea: normalizeArea(area)
    };
    setIsAdjusting(true);
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      event.preventDefault();
      const point = readPointerCoordinates(event);
      const deltaX = point.x - interaction.startX;
      const deltaY = point.y - interaction.startY;
      const start = interaction.startArea;

      if (interaction.actionType === "move") {
        updateArea({
          x: start.x + deltaX,
          y: start.y + deltaY,
          width: start.width,
          height: start.height
        });
        return;
      }

      const isLeft = interaction.corner.includes("left");
      const isRight = interaction.corner.includes("right");
      const isTop = interaction.corner.includes("top");
      const isBottom = interaction.corner.includes("bottom");

      let nextLeft = start.x;
      let nextTop = start.y;
      let nextWidth = start.width;
      let nextHeight = start.height;

      if (isLeft) {
        const leftEdge = clamp(start.x + deltaX, 0, start.x + start.width - MIN_PRINTABLE_SIZE);
        nextWidth = start.x + start.width - leftEdge;
        nextLeft = leftEdge;
      }

      if (isRight) {
        const rightEdge = clamp(
          start.x + start.width + deltaX,
          start.x + MIN_PRINTABLE_SIZE,
          STAGE_WIDTH
        );
        nextWidth = rightEdge - start.x;
      }

      if (isTop) {
        const topEdge = clamp(start.y + deltaY, 0, start.y + start.height - MIN_PRINTABLE_SIZE);
        nextHeight = start.y + start.height - topEdge;
        nextTop = topEdge;
      }

      if (isBottom) {
        const bottomEdge = clamp(
          start.y + start.height + deltaY,
          start.y + MIN_PRINTABLE_SIZE,
          STAGE_HEIGHT
        );
        nextHeight = bottomEdge - start.y;
      }

      updateArea({
        x: nextLeft,
        y: nextTop,
        width: nextWidth,
        height: nextHeight
      });
    };

    const stopInteraction = () => {
      interactionRef.current = null;
      setIsAdjusting(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopInteraction);
    window.addEventListener("pointercancel", stopInteraction);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopInteraction);
      window.removeEventListener("pointercancel", stopInteraction);
    };
  }, [area]);

  const currentArea = normalizeArea(area);

  if (!previewUrl) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-xs text-slate-500">
        Upload a mockup image first, then drag and resize the printable area on preview.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Zoom
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min="0.75"
              max="2"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
            <span className="min-w-[48px] text-right text-xs font-semibold text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
          <div
            ref={frameRef}
            className="relative mx-auto overflow-hidden rounded-lg bg-slate-100"
            style={{
              width: STAGE_WIDTH * zoom,
              height: STAGE_HEIGHT * zoom
            }}
          >
            <img src={previewUrl} alt="Mockup preview" className="h-full w-full object-contain" />

            <button
              type="button"
              onPointerDown={(event) => handlePointerDown(event, "move")}
              className="absolute cursor-move rounded-md border border-dashed border-teal-500 bg-teal-200/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
              style={{
                left: currentArea.x,
                top: currentArea.y,
                width: currentArea.width,
                height: currentArea.height
              }}
            >
              <span className="sr-only">Move printable area</span>
            </button>

            <div
              className="pointer-events-none absolute rounded-md border border-white/50"
              style={{
                left: currentArea.x + 8,
                top: currentArea.y + 8,
                width: Math.max(currentArea.width - 16, 8),
                height: Math.max(currentArea.height - 16, 8)
              }}
            />

            {[
              { key: "top-left" },
              { key: "top-right" },
              { key: "bottom-left" },
              { key: "bottom-right" }
            ].map((handle) => (
              <button
                key={handle.key}
                type="button"
                onPointerDown={(event) => handlePointerDown(event, "resize", handle.key)}
                className="absolute h-4 w-4 rounded-full border border-white bg-teal-600 shadow"
                style={{
                  left:
                    handle.key.includes("left")
                      ? currentArea.x - 8
                      : currentArea.x + currentArea.width - 8,
                  top:
                    handle.key.includes("top")
                      ? currentArea.y - 8
                      : currentArea.y + currentArea.height - 8
                }}
              >
                <span className="sr-only">Resize printable area</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Drag inside the box to move. Use corner handles to resize. Coordinates are saved automatically.
        {isAdjusting ? " Adjusting..." : ""}
      </p>
    </div>
  );
};

export default PrintableAreaSelector;
