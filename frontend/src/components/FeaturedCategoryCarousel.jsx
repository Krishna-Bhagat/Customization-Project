import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const TAGLINES = {
  "t-shirt": "Daily style made personal.",
  "hoodie": "Cozy gifts with your signature touch.",
  "tote bag": "Carry memories everywhere.",
  "handkerchief": "Small details, heartfelt stories.",
  "sweatshirt": "Comfort wear with custom charm.",
  "polo shirt": "Smart casual, uniquely yours.",
  "jerseys": "Team energy, personalized spirit.",
  "pillow covers": "Warm homes, custom love.",
  "cup": "Sip with a personal story.",
  "cups": "Personalized moments in every sip.",
  "mug": "Meaningful mornings start here."
};

const gradientFallbacks = [
  "from-teal-700 via-cyan-700 to-blue-800",
  "from-rose-700 via-pink-700 to-fuchsia-800",
  "from-indigo-700 via-slate-700 to-slate-900",
  "from-amber-700 via-orange-700 to-rose-800"
];

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const resolveCategoryImage = (categoryName, products) => {
  const categoryToken = normalizeToken(categoryName);
  const matchingProduct = (products || []).find(
    (item) => normalizeToken(item?.category) === categoryToken
  );

  if (!matchingProduct) {
    return "";
  }

  if (Array.isArray(matchingProduct.imageUrls) && matchingProduct.imageUrls.length > 0) {
    return matchingProduct.imageUrls[0];
  }

  return matchingProduct.imageUrl || "";
};

const resolveTagline = (categoryName) => {
  const token = normalizeToken(categoryName);
  return TAGLINES[token] || "Premium personalization for meaningful gifting.";
};

const FeaturedCategoryCarousel = ({ categories = [], products = [] }) => {
  const navigate = useNavigate();

  const openCategory = (name) => {
    navigate(`/products?category=${encodeURIComponent(name)}`);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-slate-900">Shop By Category</h2>
          <p className="mt-1 text-sm text-slate-600">
            Curated gifting categories crafted for style, emotion, and memorable moments.
          </p>
        </div>
        <Link to="/products" className="text-sm font-semibold text-teal-700 transition hover:text-teal-800">
          See all
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => {
          const name = category?.name || "Category";
          const imageUrl = resolveCategoryImage(name, products);
          const tagline = resolveTagline(name);
          const productCount = Number(category?.productCount || 0);
          const fallbackGradient = gradientFallbacks[index % gradientFallbacks.length];

          return (
            <motion.article
              key={category?.id || `${name}-${index}`}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              role="link"
              tabIndex={0}
              onClick={() => openCategory(name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCategory(name);
                }
              }}
              className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
            >
              <div className="relative h-52 overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${fallbackGradient}`} />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/25 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                  {productCount} {productCount === 1 ? "Product" : "Products"}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-heading text-xl font-semibold">{name}</h3>
                  <p className="mt-1 text-xs text-slate-100">{tagline}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Personalized
                </p>
                <span className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition group-hover:border-teal-300 group-hover:text-teal-700">
                  Explore
                </span>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedCategoryCarousel;
