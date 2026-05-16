import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchProducts } from "../api/index.js";
import EmptyState from "../components/EmptyState.jsx";
import PrintLocationSheet from "../components/PrintLocationSheet.jsx";
import ProductImageCarousel from "../components/ProductImageCarousel.jsx";
import ProductSkeletonGrid from "../components/ProductSkeletonGrid.jsx";
import SizeChartModal from "../components/SizeChartModal.jsx";
import StepProgress from "../components/StepProgress.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { readCustomizationSession, writeCustomizationSession } from "../utils/customizationSession.js";
import { buildProductSideOptions, toSideKey } from "../utils/productSides.js";

const getProductDescription = (product) => {
  const manualDescription = String(product?.description || "").trim();
  if (manualDescription) {
    return manualDescription;
  }

  const category = String(product?.category || "").trim();
  const base = "Designed for meaningful gifting, premium comfort, and vivid print output.";

  if (!category) {
    return base;
  }

  return `${product.name} is a premium ${category} built for custom prints and memorable gifting moments.`;
};

const normalizeSelectedSides = (candidateSides, sideOptions) => {
  const allowedSideKeys = sideOptions.map((side) => side.key);
  if (allowedSideKeys.length === 0) {
    return ["front"];
  }

  const normalized = Array.isArray(candidateSides)
    ? candidateSides
        .map((side) => toSideKey(side))
        .filter((side, index, arr) => allowedSideKeys.includes(side) && arr.indexOf(side) === index)
    : [];

  return normalized.length > 0 ? normalized : [allowedSideKeys[0]];
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pushToast } = useToast();

  const requestedSize = String(searchParams.get("size") || "").trim().toUpperCase();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [selectedSides, setSelectedSides] = useState(["front"]);

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const list = await fetchProducts();
        const found = list.find((item) => String(item.id) === String(id));

        if (!found) {
          setProduct(null);
          return;
        }

        setProduct(found);

        const productImages =
          Array.isArray(found.imageUrls) && found.imageUrls.length > 0
            ? found.imageUrls
            : found.imageUrl
              ? [found.imageUrl]
              : [];

        const sideOptions = buildProductSideOptions(found, {
          fallbackImage: productImages[0] || found.imageUrl || ""
        });

        const existingSession = readCustomizationSession(id) || {};
        const availableSizes = found.availableSizes || [];

        const querySize = availableSizes.includes(requestedSize) ? requestedSize : "";
        const sessionSize = availableSizes.includes(existingSession.selectedSize)
          ? existingSession.selectedSize
          : "";

        setSelectedSize(querySize || sessionSize || availableSizes[0] || "");
        setQuantity(Number(existingSession.quantity) > 0 ? Number(existingSession.quantity) : 1);
        setSelectedSides(normalizeSelectedSides(existingSession.selectedSides, sideOptions));
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Failed to load product details.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, requestedSize]);

  const hasSizes = (product?.availableSizes || []).length > 0;
  const canContinue = !hasSizes || Boolean(selectedSize);

  const subtitle = useMemo(() => {
    if (!product) {
      return "";
    }
    return `${product.category} | Premium Personalized Edition`;
  }, [product]);

  const productImageList = useMemo(() => {
    if (!product) {
      return [];
    }
    if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  const sideOptions = useMemo(
    () =>
      buildProductSideOptions(product, {
        fallbackImage: productImageList[0] || product?.imageUrl || ""
      }),
    [product, productImageList]
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    setSelectedSides((previous) => normalizeSelectedSides(previous, sideOptions));
  }, [product, sideOptions]);

  const persistBaseSelection = () => {
    const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);

    const next = {
      selectedSize,
      quantity,
      selectedSides: normalizedSelectedSides,
      activeSide: normalizedSelectedSides[0] || "front"
    };

    writeCustomizationSession(id, next);
  };

  const toggleSide = (sideKey) => {
    const normalizedSideKey = toSideKey(sideKey);

    setSelectedSides((current) => {
      if (current.includes(normalizedSideKey)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== normalizedSideKey);
      }

      const allowed = sideOptions.some((side) => side.key === normalizedSideKey);
      if (!allowed) {
        return current;
      }

      return [...current, normalizedSideKey];
    });
  };

  const handleDesignOnline = () => {
    if (!canContinue) {
      pushToast({ type: "error", message: "Please select a size before designing." });
      return;
    }
    persistBaseSelection();
    setIsPrintSheetOpen(true);
  };

  const handleContinueFromLocation = () => {
    const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);

    if (normalizedSelectedSides.length === 0) {
      pushToast({ type: "error", message: "Select at least one print location." });
      return;
    }

    writeCustomizationSession(id, {
      selectedSize,
      quantity,
      selectedSides: normalizedSelectedSides,
      activeSide: normalizedSelectedSides[0] || "front"
    });

    setIsPrintSheetOpen(false);
    navigate(`/customize/${id}/workspace`);
  };

  const handleBuyNow = () => {
    if (!canContinue) {
      pushToast({ type: "error", message: "Please select a size before checkout." });
      return;
    }

    const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);

    writeCustomizationSession(id, {
      selectedSize,
      quantity,
      selectedSides: normalizedSelectedSides,
      activeSide: normalizedSelectedSides[0] || "front"
    });

    navigate(`/customize/${id}/checkout`);
  };

  const increaseQuantity = () => setQuantity((prev) => Math.min(prev + 1, 20));
  const decreaseQuantity = () => setQuantity((prev) => Math.max(prev - 1, 1));

  if (isLoading) {
    return (
      <section className="space-y-4">
        <StepProgress activeStep={1} />
        <ProductSkeletonGrid count={1} />
      </section>
    );
  }

  if (errorMessage) {
    return <EmptyState title="Unable to load product" description={errorMessage} />;
  }

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        description="This product may have been removed. Please pick another product."
        action={(
          <Link
            to="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to Products
          </Link>
        )}
      />
    );
  }

  return (
    <section className="space-y-4 pb-4">
      <StepProgress activeStep={1} />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <ProductImageCarousel imageUrl={product.imageUrl} imageUrls={productImageList} title={product.name} />

          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">GiftCraft Studio</p>
              <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight text-slate-900">
                {product.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-brand-700">{subtitle}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{getProductDescription(product)}</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">${Number(product.price).toFixed(2)}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Size
                <select
                  value={selectedSize}
                  onChange={(event) => setSelectedSize(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
                  disabled={!hasSizes}
                >
                  {!hasSizes ? <option value="">Universal</option> : null}
                  {hasSizes ? <option value="">Select size</option> : null}
                  {(product.availableSizes || []).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Quantity</p>
              <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  -
                </button>
                <span className="inline-flex h-10 min-w-10 items-center justify-center border-x border-slate-300 px-3 text-sm font-semibold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={increaseQuantity}
                  className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSizeChartOpen(true)}
                className="ml-auto inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Size Chart
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canContinue}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={handleDesignOnline}
                disabled={!canContinue}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Design Online
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <SizeChartModal open={isSizeChartOpen} onClose={() => setIsSizeChartOpen(false)} />

      <PrintLocationSheet
        open={isPrintSheetOpen}
        onClose={() => setIsPrintSheetOpen(false)}
        selectedSides={selectedSides}
        onToggleSide={toggleSide}
        onContinue={handleContinueFromLocation}
        sideOptions={sideOptions}
        productImage={productImageList[0] || product.imageUrl}
      />
    </section>
  );
};

export default ProductDetailPage;
