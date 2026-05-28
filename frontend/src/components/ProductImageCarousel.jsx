import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const SWIPE_THRESHOLD = 36;

const clampIndex = (index, count) => {
  if (count <= 0) {
    return 0;
  }
  if (index < 0) {
    return count - 1;
  }
  if (index >= count) {
    return 0;
  }
  return index;
};

const ProductImageCarousel = ({ imageUrl, imageUrls = [], title }) => {
  const images = useMemo(() => {
    const list =
      Array.isArray(imageUrls) && imageUrls.length > 0
        ? imageUrls
        : imageUrl
          ? [imageUrl]
          : [];

    return list.map((url, index) => ({
      key: `image-${index}`,
      label: `Image ${index + 1}`,
      url
    }));
  }, [imageUrl, imageUrls]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  const active = images[clampIndex(activeIndex, images.length)];

  const goToIndex = (nextIndex) => {
    setActiveIndex(clampIndex(nextIndex, images.length));
  };

  const goPrev = () => goToIndex(activeIndex - 1);
  const goNext = () => goToIndex(activeIndex + 1);

  const onTouchStart = (event) => {
    const point = event.touches?.[0];
    if (!point) {
      return;
    }
    setTouchStartX(point.clientX);
    setTouchEndX(point.clientX);
  };

  const onTouchMove = (event) => {
    const point = event.touches?.[0];
    if (!point) {
      return;
    }
    setTouchEndX(point.clientX);
  };

  const onTouchEnd = () => {
    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) {
      return;
    }
    if (delta > 0) {
      goNext();
      return;
    }
    goPrev();
  };

  if (!active) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
      <div
        className="relative overflow-hidden rounded-2xl bg-slate-100"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <motion.img
          key={active.key}
          src={active.url}
          alt={`${title} ${active.label}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.24 }}
          className="h-[320px] w-full select-none object-cover sm:h-[420px]"
          loading="lazy"
          draggable={false}
        />

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800">
          {active.label}
        </span>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white"
              aria-label="Previous image"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white"
              aria-label="Next image"
            >
              {">"}
            </button>
          </>
        ) : null}

        {images.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-slate-900/50 px-2 py-1">
            {images.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => goToIndex(index)}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index === activeIndex ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`View ${item.label}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {images.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => goToIndex(index)}
              className={`relative h-16 min-w-16 overflow-hidden rounded-xl border transition ${
                index === activeIndex
                  ? "border-brand-400 ring-2 ring-brand-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              aria-label={`Open ${item.label}`}
            >
              <img
                src={item.url}
                alt={`${title} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ProductImageCarousel;
