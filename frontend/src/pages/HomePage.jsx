import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCategories, fetchProducts } from "../api/index.js";
import EmptyState from "../components/EmptyState.jsx";
import FeaturedCategoryCarousel from "../components/FeaturedCategoryCarousel.jsx";
import GiftPromotionSection from "../components/GiftPromotionSection.jsx";
import HomeHero from "../components/HomeHero.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ProductSkeletonGrid from "../components/ProductSkeletonGrid.jsx";
import TestimonialsSection from "../components/TestimonialsSection.jsx";

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSizesByProduct, setSelectedSizesByProduct] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadStorefrontData = async () => {
      try {
        const [productResponse, categoryResponse] = await Promise.all([fetchProducts(), fetchCategories()]);
        setProducts(productResponse);
        setCategories(categoryResponse);
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Failed to load storefront data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadStorefrontData();
  }, []);

  const handleSelectSize = (productId, size) => {
    setSelectedSizesByProduct((prev) => ({
      ...prev,
      [productId]: size
    }));
  };

  const featuredProducts = products.slice(0, 4);

  return (
    <section className="space-y-10">
      <HomeHero />

      {categories.length > 0 ? (
        <FeaturedCategoryCarousel categories={categories} products={products} />
      ) : null}

      <GiftPromotionSection />

      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-slate-900">Trending Personalized Products</h2>
            <p className="mt-1 text-sm text-slate-600">Tap a size and start customizing instantly.</p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Browse all
          </Link>
        </div>

        <div className="mt-4">
          {isLoading ? <ProductSkeletonGrid count={4} /> : null}
          {errorMessage ? (
            <EmptyState
              title="Could not load products"
              description="Please refresh once. We are preparing your gifting catalog."
            />
          ) : null}
          {!isLoading && !errorMessage && featuredProducts.length === 0 ? (
            <EmptyState
              title="No products available yet"
              description="Add products from admin panel to start showing personalized gifting options."
            />
          ) : null}
          {!isLoading && !errorMessage && featuredProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    selectedSize={selectedSizesByProduct[product.id] || ""}
                    onSelectSize={handleSelectSize}
                  />
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <TestimonialsSection />

      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-6 py-10 text-white shadow-soft sm:px-8">
        <h2 className="font-heading text-2xl font-semibold">Create Personalized Gifts For Loved Ones</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          From birthdays to anniversaries, build meaningful products with our mobile-first customizer.
        </p>
        <div className="mt-5">
          <Link
            to="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Start Designing
          </Link>
        </div>
      </section>
    </section>
  );
};

export default HomePage;
