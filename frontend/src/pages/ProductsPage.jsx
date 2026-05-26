import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchCategories, fetchProducts } from "../api/index.js";
import EmptyState from "../components/EmptyState.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ProductSkeletonGrid from "../components/ProductSkeletonGrid.jsx";

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSizesByProduct, setSelectedSizesByProduct] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryResponse = await fetchCategories();
        setCategories(categoryResponse);
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Failed to load categories.");
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }

    const queryCategory = String(searchParams.get("category") || "").trim().toLowerCase();
    if (!queryCategory) {
      return;
    }

    const matchedCategory = categories.find(
      (category) => String(category?.name || "").trim().toLowerCase() === queryCategory
    );

    if (matchedCategory?.name) {
      setActiveCategory(matchedCategory.name);
    }
  }, [categories, searchParams]);

  useEffect(() => {
    let isSubscribed = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const productResponse = await fetchProducts({
          search: debouncedSearchTerm,
          category: activeCategory === "All" ? "" : activeCategory
        });

        if (isSubscribed) {
          setProducts(Array.isArray(productResponse) ? productResponse : []);
        }
      } catch (error) {
        if (isSubscribed) {
          setErrorMessage(error.response?.data?.message || "Failed to load products.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isSubscribed = false;
    };
  }, [debouncedSearchTerm, activeCategory]);

  const handleSelectSize = (productId, size) => {
    setSelectedSizesByProduct((prev) => ({
      ...prev,
      [productId]: size
    }));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <h1 className="font-heading text-3xl font-semibold text-slate-900">Explore Personalized Products</h1>
        <p className="mt-2 text-sm text-slate-600">
          Discover premium gifting products, choose a size, and jump into customization.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search products..."
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <select
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring sm:min-w-[220px]"
          >
            <option value="All">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        {isLoading ? <ProductSkeletonGrid count={9} /> : null}
        {errorMessage ? (
          <EmptyState title="Unable to load products" description="Please try again after a short while." />
        ) : null}
        {!isLoading && !errorMessage && products.length === 0 ? (
          <EmptyState
            title="No matching products"
            description="Try a different keyword or category filter to find the perfect gift."
          />
        ) : null}
        {!isLoading && !errorMessage && products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectedSize={selectedSizesByProduct[product.id] || ""}
                onSelectSize={handleSelectSize}
              />
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
};

export default ProductsPage;
