import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchDraftByProduct, fetchProducts, saveDraft } from "../api/index.js";
import EmptyState from "../components/EmptyState.jsx";
import FabricDesigner from "../components/FabricDesigner.jsx";
import ProductSkeletonGrid from "../components/ProductSkeletonGrid.jsx";
import StepProgress from "../components/StepProgress.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useUserAuth } from "../context/UserAuthContext.jsx";
import {
  dismissDraftImportPrompt,
  isDraftImportDismissed,
  readCustomizationSession,
  writeCustomizationSession
} from "../utils/customizationSession.js";
import { buildProductSideOptions, formatSideLabel, toSideKey } from "../utils/productSides.js";

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

const ProductOptionsSheet = ({
  open,
  onClose,
  selectedSize,
  setSelectedSize,
  quantity,
  setQuantity,
  product,
  selectedSides,
  sideOptions
}) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-slate-900/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 34, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-200" />
          <h3 className="mt-4 font-heading text-xl font-semibold text-slate-900">Product Options</h3>

          <div className="mt-3 space-y-3">
            {(product.availableSizes || []).length > 0 ? (
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Size
                <select
                  value={selectedSize}
                  onChange={(event) => setSelectedSize(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                >
                  <option value="">Select size</option>
                  {(product.availableSizes || []).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Quantity</p>
              <div className="mt-1 inline-flex items-center rounded-xl border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700"
                >
                  -
                </button>
                <span className="inline-flex min-w-10 items-center justify-center border-x border-slate-300 px-3 text-sm font-semibold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.min(20, prev + 1))}
                  className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Selected Print Areas</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedSides.map((side) => (
                  <span
                    key={side}
                    className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                  >
                    {sideOptions.find((item) => item.key === side)?.label || formatSideLabel(side)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Done
          </button>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

const CustomizerWorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { addToCart } = useCart();
  const { token, isAuthenticated } = useUserAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [product, setProduct] = useState(null);

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedSides, setSelectedSides] = useState(["front"]);
  const [activeSide, setActiveSide] = useState("front");
  const [canvasStates, setCanvasStates] = useState({});
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [showDraftImportPrompt, setShowDraftImportPrompt] = useState(false);
  const [pendingLocalDraft, setPendingLocalDraft] = useState(null);

  useEffect(() => {
    const loadData = async () => {
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

        const localSession = readCustomizationSession(id) || {};
        let serverDraft = null;

        if (isAuthenticated && token) {
          try {
            const draftResponse = await fetchDraftByProduct({ token, productId: id });
            serverDraft = draftResponse?.draft || null;
          } catch {
            serverDraft = null;
          }
        }

        const session =
          serverDraft && Number(serverDraft.savedAt || 0) > Number(localSession.savedAt || 0)
            ? {
                ...localSession,
                ...serverDraft
              }
            : localSession;

        if (
          isAuthenticated &&
          token &&
          localSession &&
          Object.keys(localSession).length > 0 &&
          !serverDraft &&
          !isDraftImportDismissed(id)
        ) {
          setPendingLocalDraft(localSession);
          setShowDraftImportPrompt(true);
        } else {
          setPendingLocalDraft(null);
          setShowDraftImportPrompt(false);
        }

        const availableSizes = found.availableSizes || [];
        const normalizedSides = normalizeSelectedSides(session.selectedSides, sideOptions);
        const normalizedActiveSide = normalizedSides.includes(toSideKey(session.activeSide))
          ? toSideKey(session.activeSide)
          : normalizedSides[0];
        const normalizedCanvasStates = Object.entries(session.canvasStates || {}).reduce(
          (acc, [side, snapshot]) => {
            const sideKey = toSideKey(side);
            if (sideKey) {
              acc[sideKey] = snapshot;
            }
            return acc;
          },
          {}
        );

        setSelectedSides(normalizedSides);
        setActiveSide(normalizedActiveSide);
        setCanvasStates(normalizedCanvasStates);
        setQuantity(Number(session.quantity) > 0 ? Number(session.quantity) : 1);

        if (availableSizes.length > 0) {
          const validSize = availableSizes.includes(session.selectedSize) ? session.selectedSize : availableSizes[0];
          setSelectedSize(validSize);
        } else {
          setSelectedSize("");
        }
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Failed to load customization workspace.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, isAuthenticated, token]);

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

  const persistDraftToServer = async (payload) => {
    if (!isAuthenticated || !token || !product) {
      return;
    }

    try {
      await saveDraft({
        token,
        productId: id,
        payload: {
          selectedSize,
          quantity,
          selectedSides: payload.selectedSides || selectedSides,
          activeSide: payload.activeSide || activeSide,
          canvasStates: payload.canvasStates || {},
          designExports: payload.designExports || {},
          previewImage:
            Object.values(payload.designExports || {}).find(Boolean) || "",
          savedAt: Date.now()
        }
      });
    } catch {
      // Silent fallback: local draft remains available.
    }
  };

  useEffect(() => {
    if (!product) {
      return;
    }

    setSelectedSides((previous) => normalizeSelectedSides(previous, sideOptions));
  }, [product, sideOptions]);

  useEffect(() => {
    const allowed = new Set(sideOptions.map((side) => side.key));
    if (allowed.size === 0) {
      return;
    }

    const normalized = toSideKey(activeSide);
    if (!allowed.has(normalized)) {
      setActiveSide(normalizeSelectedSides(selectedSides, sideOptions)[0]);
    }
  }, [activeSide, selectedSides, sideOptions]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);
    const normalizedActiveSide = normalizedSelectedSides.includes(toSideKey(activeSide))
      ? toSideKey(activeSide)
      : normalizedSelectedSides[0];

    writeCustomizationSession(id, {
      selectedSize,
      quantity,
      selectedSides: normalizedSelectedSides,
      activeSide: normalizedActiveSide
    });
  }, [activeSide, id, product, quantity, selectedSides, selectedSize, sideOptions]);

  const handleSaveSnapshot = (payload) => {
    setCanvasStates(payload.canvasStates || {});
    const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);
    const normalizedActiveSide = toSideKey(payload.activeSide || activeSide);
    const resolvedActiveSide = normalizedSelectedSides.includes(normalizedActiveSide)
      ? normalizedActiveSide
      : normalizedSelectedSides[0];
    setActiveSide(resolvedActiveSide);

    writeCustomizationSession(id, {
      selectedSize,
      quantity,
      selectedSides: normalizedSelectedSides,
      activeSide: resolvedActiveSide,
      canvasStates: payload.canvasStates || {},
      designExports: payload.designExports || {},
      savedAt: Date.now()
    });

    persistDraftToServer({
      selectedSides: normalizedSelectedSides,
      activeSide: resolvedActiveSide,
      canvasStates: payload.canvasStates || {},
      designExports: payload.designExports || {}
    });
  };

  const handleProceedCheckout = async (payload) => {
    if ((product.availableSizes || []).length > 0 && !selectedSize) {
      pushToast({ type: "error", message: "Please select a size before adding to cart." });
      return;
    }

    handleSaveSnapshot(payload);

    const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);
    const cartPayload = {
      productId: Number(id),
      selectedSize,
      quantity,
      selectedSides: normalizedSelectedSides,
      customizationState: {
        selectedSize,
        quantity,
        selectedSides: normalizedSelectedSides,
        activeSide: toSideKey(payload.activeSide || activeSide),
        canvasStates: payload.canvasStates || {},
        designExports: payload.designExports || {},
        savedAt: Date.now()
      },
      previewImage: Object.values(payload.designExports || {}).find(Boolean) || "",
      unitPrice: Number(product.price || 0),
      product: {
        id: Number(product.id),
        name: product.name,
        category: product.category,
        description: product.description || "",
        price: Number(product.price || 0),
        imageUrl: productImageList[0] || product.imageUrl || "",
        galleryImages: productImageList
      }
    };

    try {
      await addToCart(cartPayload);
      pushToast({ type: "success", message: "Added to cart successfully." });
      navigate("/cart");
    } catch (error) {
      pushToast({
        type: "error",
        message: error.response?.data?.message || "Unable to add item to cart."
      });
    }
  };

  const handleImportDraft = async () => {
    if (!pendingLocalDraft || !product) {
      setShowDraftImportPrompt(false);
      return;
    }

    const availableSizes = product.availableSizes || [];
    const normalizedSelectedSides = normalizeSelectedSides(pendingLocalDraft.selectedSides, sideOptions);
    const normalizedActiveSide = normalizedSelectedSides.includes(toSideKey(pendingLocalDraft.activeSide))
      ? toSideKey(pendingLocalDraft.activeSide)
      : normalizedSelectedSides[0];
    const normalizedCanvasStates = Object.entries(pendingLocalDraft.canvasStates || {}).reduce(
      (acc, [side, snapshot]) => {
        const sideKey = toSideKey(side);
        if (sideKey) {
          acc[sideKey] = snapshot;
        }
        return acc;
      },
      {}
    );
    const normalizedDesignExports = Object.entries(pendingLocalDraft.designExports || {}).reduce(
      (acc, [side, dataUrl]) => {
        const sideKey = toSideKey(side);
        if (sideKey && dataUrl) {
          acc[sideKey] = dataUrl;
        }
        return acc;
      },
      {}
    );
    const nextQuantity = Number(pendingLocalDraft.quantity) > 0 ? Number(pendingLocalDraft.quantity) : 1;
    const nextSize =
      availableSizes.length > 0
        ? availableSizes.includes(pendingLocalDraft.selectedSize)
          ? pendingLocalDraft.selectedSize
          : availableSizes[0]
        : "";

    setSelectedSides(normalizedSelectedSides);
    setActiveSide(normalizedActiveSide);
    setCanvasStates(normalizedCanvasStates);
    setQuantity(nextQuantity);
    setSelectedSize(nextSize);

    writeCustomizationSession(id, {
      selectedSize: nextSize,
      quantity: nextQuantity,
      selectedSides: normalizedSelectedSides,
      activeSide: normalizedActiveSide,
      canvasStates: normalizedCanvasStates,
      designExports: normalizedDesignExports,
      savedAt: Date.now()
    });

    await persistDraftToServer({
      selectedSides: normalizedSelectedSides,
      activeSide: normalizedActiveSide,
      canvasStates: normalizedCanvasStates,
      designExports: normalizedDesignExports
    });

    dismissDraftImportPrompt(id);
    setPendingLocalDraft(null);
    setShowDraftImportPrompt(false);
    pushToast({ type: "success", message: "Local draft imported successfully." });
  };

  const handleDismissDraftImport = () => {
    dismissDraftImportPrompt(id);
    setPendingLocalDraft(null);
    setShowDraftImportPrompt(false);
  };

  const sideSummary = useMemo(
    () =>
      selectedSides
        .map((side) => sideOptions.find((item) => item.key === side)?.label || formatSideLabel(side))
        .join(", "),
    [selectedSides, sideOptions]
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 py-3">
        <StepProgress activeStep={3} />
        <div className="mt-3">
          <ProductSkeletonGrid count={1} />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 py-3">
        <EmptyState title="Unable to open customizer" description={errorMessage} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 py-3">
        <EmptyState
          title="Product not found"
          description="Please choose another product to continue customization."
          action={
            <Link
              to="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Back to Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-3 py-3">
      <header className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Step 3 of 4</p>
            <h1 className="font-heading text-xl font-semibold text-slate-900">Design Workspace</h1>
          </div>
          <Link
            to={`/product/${id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-3">
          <StepProgress activeStep={3} />
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">{product.name}</p>
          <p className="mt-0.5">Print areas: {sideSummary}</p>
        </div>

        {showDraftImportPrompt ? (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
            <p className="font-semibold">Import existing draft?</p>
            <p className="mt-1 text-xs text-sky-700">
              A local design draft was found for this product. Import it to your account draft storage.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleImportDraft}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Import Draft
              </button>
              <button
                type="button"
                onClick={handleDismissDraftImport}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mt-3">
        <FabricDesigner
          productImage={productImageList[0] || product.imageUrl}
          productImages={productImageList}
          category={product.category}
          sideOptions={sideOptions.filter((side) => selectedSides.includes(side.key))}
          initialSide={activeSide}
          initialCanvasStates={canvasStates}
          onNotify={pushToast}
          onOpenProductPanel={() => setIsProductSheetOpen(true)}
          onSave={handleSaveSnapshot}
          onProceedCheckout={handleProceedCheckout}
        />
      </div>

      <ProductOptionsSheet
        open={isProductSheetOpen}
        onClose={() => setIsProductSheetOpen(false)}
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
        quantity={quantity}
        setQuantity={setQuantity}
        product={product}
        selectedSides={selectedSides}
        sideOptions={sideOptions}
      />
    </div>
  );
};

export default CustomizerWorkspacePage;
