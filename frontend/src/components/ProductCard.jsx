import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const ProductCard = ({ product, selectedSize, onSelectSize, showSizeSelector = true }) => {
  const navigate = useNavigate();
  const availableSizes = product.availableSizes || [];
  const requiresSizeSelection = showSizeSelector && availableSizes.length > 0;
  const canContinue = !requiresSizeSelection || Boolean(selectedSize);
  const primaryImage = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
    ? product.imageUrls[0]
    : product.imageUrl;

  const query = new URLSearchParams();
  if (selectedSize) {
    query.set("size", selectedSize);
  }
  const detailUrl = `/product/${product.id}${query.toString() ? `?${query.toString()}` : ""}`;

  const handleCardNavigate = () => {
    navigate(detailUrl);
  };

  const handleCardClick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("a,button,input,select,textarea,label")) {
      return;
    }
    handleCardNavigate();
  };

  const handleCardKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardNavigate();
    }
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
    >
      <div className="relative overflow-hidden bg-slate-100">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 inline-flex rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
          {product.category}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900">{product.name}</h3>
          {product.description ? (
            <p className="mt-1 text-xs text-slate-500">{product.description}</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-slate-700">NPR {Number(product.price).toFixed(2)}</p>
        </div>

        {requiresSizeSelection ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Select Size
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSelectSize(product.id, size)}
                  className={`min-h-9 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedSize === size
                      ? "border-teal-500 bg-teal-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Link
            to={detailUrl}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
              canContinue
                ? "bg-brand-600 hover:bg-brand-700"
                : "pointer-events-none cursor-not-allowed bg-slate-300"
            }`}
          >
            Design Online
          </Link>
          <Link
            to={detailUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Buy Now
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;
