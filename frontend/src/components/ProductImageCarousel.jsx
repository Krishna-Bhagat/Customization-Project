import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const ProductImageCarousel = ({ imageUrl, imageUrls = [], title }) => {
  const images = useMemo(() => {
    const list = Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls
      : imageUrl
        ? [imageUrl]
        : [];

    if (list.length === 0) {
      return [];
    }

    return list.map((url, index) => ({
      key: `image-${index}`,
      label: `Image ${index + 1}`,
      url,
      viewClass: ""
    }));
  }, [imageUrl, imageUrls]);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[Math.min(activeIndex, Math.max(images.length - 1, 0))];

  if (!active) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
      <motion.div
        key={active.key}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24 }}
        className="relative overflow-hidden rounded-2xl bg-slate-100"
      >
        <img
          src={active.url}
          alt={`${title} ${active.label}`}
          className={`h-80 w-full object-cover ${active.viewClass}`}
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800">
          {active.label} View
        </span>
      </motion.div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {images.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`min-w-[84px] rounded-xl border px-2 py-2 text-xs font-semibold transition ${
              index === activeIndex
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductImageCarousel;
