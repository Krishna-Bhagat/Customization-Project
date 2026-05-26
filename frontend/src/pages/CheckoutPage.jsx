import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserOrder,
  deleteDraft,
  fetchProducts,
  uploadDesign
} from "../api/index.js";
import AuthModal from "../components/AuthModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { CANVAS_DIMENSIONS, getPrintableArea } from "../constants/customizer.js";
import { useCart } from "../context/CartContext.jsx";
import { useUserAuth } from "../context/UserAuthContext.jsx";
import { clearCustomizationSession } from "../utils/customizationSession.js";
import {
  buildDesignFileName,
  composeMockupPreview,
  triggerDownload
} from "../utils/designDownload.js";
import { formatSideLabel, toSideKey } from "../utils/productSides.js";

const normalizePrintableArea = (area, category, sideKey) => {
  const fallback = getPrintableArea(category, sideKey);
  const left = Number(area?.left ?? area?.x);
  const top = Number(area?.top ?? area?.y);
  const width = Number(area?.width);
  const height = Number(area?.height);

  return {
    left: Number.isFinite(left) ? left : fallback.left,
    top: Number.isFinite(top) ? top : fallback.top,
    width: Number.isFinite(width) ? width : fallback.width,
    height: Number.isFinite(height) ? height : fallback.height
  };
};

const normalizeDesignExports = (item) =>
  Object.entries(item?.customizationState?.designExports || {}).reduce((acc, [side, value]) => {
    const sideKey = toSideKey(side);
    if (sideKey && value) {
      acc[sideKey] = value;
    }
    return acc;
  }, {});

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { token, user, isAuthenticated } = useUserAuth();
  const { items, subtotal, clearCart } = useCart();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPostOrderPromptOpen, setIsPostOrderPromptOpen] = useState(false);
  const [postOrderData, setPostOrderData] = useState(null);
  const [catalogById, setCatalogById] = useState({});

  const shipping = 0;
  const total = subtotal + shipping;

  const hasAddress = Boolean(user?.defaultAddress);
  const orderItems = useMemo(() => items || [], [items]);

  useEffect(() => {
    let isMounted = true;

    const loadProductCatalog = async () => {
      try {
        const products = await fetchProducts();
        if (!isMounted) {
          return;
        }

        const lookup = products.reduce((acc, product) => {
          acc[String(product.id)] = product;
          return acc;
        }, {});

        setCatalogById(lookup);
      } catch {
        // Silent fallback: checkout still works using cart snapshots.
      }
    };

    loadProductCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const resolveSidePreviewPayload = ({ item, sideKey }) => {
    const normalizedSide = toSideKey(sideKey);
    const productId = String(item.productId || item.product?.id || "");
    const catalogProduct = catalogById[productId] || {};
    const sideRows = Array.isArray(catalogProduct.sides) ? catalogProduct.sides : [];
    const sideRow = sideRows.find(
      (row) => toSideKey(row?.sideKey || row?.sideName) === normalizedSide
    );

    const printableArea = normalizePrintableArea(
      sideRow?.printableArea,
      item.product?.category || catalogProduct.category,
      normalizedSide
    );

    const productGallery =
      (Array.isArray(catalogProduct.galleryImages) && catalogProduct.galleryImages.length > 0
        ? catalogProduct.galleryImages
        : Array.isArray(item.product?.galleryImages)
          ? item.product.galleryImages
          : []) || [];

    const mockupUrl =
      sideRow?.mockupImage ||
      productGallery[0] ||
      item.product?.imageUrl ||
      item.previewImage ||
      "";

    return {
      printableArea,
      mockupUrl
    };
  };

  const downloadSingleSidePreview = async ({ item, sideKey, designUrl, manageLoading = true }) => {
    const sideLabel = formatSideLabel(sideKey);
    if (!designUrl) {
      return false;
    }

    if (manageLoading) {
      setIsDownloading(true);
    }

    try {
      const { printableArea, mockupUrl } = resolveSidePreviewPayload({ item, sideKey });
      const previewDataUrl = await composeMockupPreview({
        mockupUrl,
        designUrl,
        printableArea,
        canvasWidth: CANVAS_DIMENSIONS.width,
        canvasHeight: CANVAS_DIMENSIONS.height,
        multiplier: 3
      });

      triggerDownload(
        previewDataUrl,
        buildDesignFileName({
          productName: item.product?.name || "custom-product",
          sideLabel
        })
      );
      return true;
    } catch {
      triggerDownload(
        designUrl,
        buildDesignFileName({
          productName: item.product?.name || "custom-product",
          sideLabel: `${sideLabel}-design-only`
        })
      );
      return true;
    } finally {
      if (manageLoading) {
        setIsDownloading(false);
      }
    }
  };

  const handleDownloadDesigns = async () => {
    if (orderItems.length === 0) {
      pushToast({ type: "info", message: "No designs available for download." });
      return;
    }

    setIsDownloading(true);
    try {
      let downloadedCount = 0;

      for (const item of orderItems) {
        const designExports = normalizeDesignExports(item);
        const selectedSides = Array.isArray(item.selectedSides)
          ? item.selectedSides.map((side) => toSideKey(side))
          : [];

        const sidesToDownload = Array.from(
          new Set([...selectedSides, ...Object.keys(designExports)].filter(Boolean))
        );

        for (const sideKey of sidesToDownload) {
          const designUrl = designExports[sideKey];
          // eslint-disable-next-line no-await-in-loop
          const downloaded = await downloadSingleSidePreview({
            item,
            sideKey,
            designUrl,
            manageLoading: false
          });
          if (downloaded) {
            downloadedCount += 1;
          }
        }
      }

      if (downloadedCount === 0) {
        pushToast({ type: "info", message: "No design exports found to download." });
      } else {
        pushToast({ type: "success", message: "Design previews downloaded." });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFinishOrder = async () => {
    const cleanupItems = Array.isArray(postOrderData?.items) ? postOrderData.items : [];

    for (const item of cleanupItems) {
      clearCustomizationSession(item.productId);
      if (token && item.productId) {
        // eslint-disable-next-line no-await-in-loop
        await deleteDraft({ token, productId: item.productId }).catch(() => {});
      }
    }

    await clearCart();
    setIsPostOrderPromptOpen(false);
    setPostOrderData(null);
    pushToast({ type: "success", message: "Checkout completed. Cart and drafts cleared." });
    navigate("/orders");
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated || !token) {
      pushToast({
        type: "info",
        message: "Please login or create an account to continue."
      });
      setIsAuthOpen(true);
      return;
    }

    if (orderItems.length === 0) {
      pushToast({ type: "error", message: "Cart is empty." });
      return;
    }

    if (!hasAddress) {
      pushToast({
        type: "error",
        message: "Please update your profile address before placing order."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const preparedItems = [];

      for (const item of orderItems) {
        const designExports = item.customizationState?.designExports || {};
        const hasDesign = Object.values(designExports).some(Boolean);
        if (!hasDesign) {
          throw new Error(`Missing design for ${item.product?.name || "item"}.`);
        }

        // eslint-disable-next-line no-await-in-loop
        const uploadResult = await uploadDesign({ designs: designExports });

        preparedItems.push({
          productId: Number(item.productId),
          quantity: Number(item.quantity || 1),
          selectedSize: item.selectedSize || "",
          selectedSides: item.selectedSides || [],
          customizationData: item.customizationState || {},
          designUrls: uploadResult.designUrls || {}
        });
      }

      const response = await createUserOrder({
        token,
        payload: {
          addressSnapshot: user.defaultAddress,
          items: preparedItems
        }
      });

      pushToast({
        type: "success",
        message: response.message || "Order placed successfully. Download your design before finishing."
      });
      setPostOrderData({
        orderNumber: response?.order?.orderNumber || "",
        items: orderItems.map((item) => ({
          productId: item.productId
        }))
      });
      setIsPostOrderPromptOpen(true);
    } catch (error) {
      pushToast({
        type: "error",
        message: error.response?.data?.message || error.message || "Failed to place order."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderItems.length === 0) {
    return (
      <EmptyState
        title="No items for checkout"
        description="Your cart is empty. Add customized products to continue."
        action={
          <Link
            to="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Explore Products
          </Link>
        }
      />
    );
  }

  return (
    <section className="space-y-4 pb-20">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Checkout</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-slate-900">Review & Place Order</h1>
      </header>

      {!isAuthenticated ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-700">Please login or create an account to continue.</p>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Login / Sign Up
          </button>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold text-slate-900">Delivery Address</h2>
              <Link to="/profile" className="text-xs font-semibold text-brand-700">
                Edit Profile
              </Link>
            </div>
            {hasAddress ? (
              <div className="mt-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{user.fullName}</p>
                <p>{user.phone}</p>
                {user.email ? <p>{user.email}</p> : null}
                <p className="mt-1">
                  {user.defaultAddress.streetTole}, Ward {user.defaultAddress.wardNumber},{" "}
                  {user.defaultAddress.municipalityCity}, {user.defaultAddress.district},{" "}
                  {user.defaultAddress.province}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-rose-700">Address missing. Please update your profile.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <h2 className="font-heading text-lg font-semibold text-slate-900">Items</h2>
            <div className="mt-3 space-y-3">
              {orderItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product?.name || "Product"}</p>
                      <p className="text-xs text-slate-600">{item.product?.category || "Category"}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        Size: <span className="font-semibold">{item.selectedSize || "N/A"}</span>
                      </p>
                      <p className="text-sm text-slate-700">
                        Quantity: <span className="font-semibold">{item.quantity}</span>
                      </p>
                      <p className="text-xs text-slate-600">
                        Sides: {(item.selectedSides || []).map((side) => formatSideLabel(side)).join(", ") || "N/A"}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      NPR {(Number(item.unitPrice || item.product?.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Summary</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>NPR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `NPR ${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>NPR {total.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || isPostOrderPromptOpen}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Placing Order..." : isPostOrderPromptOpen ? "Order Placed" : "Place Order"}
          </button>
        </aside>
      </div>

      <AuthModal
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => navigate("/checkout")}
      />

      <AnimatePresence>
        {isPostOrderPromptOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-slate-900/60 px-4"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-4 bottom-4 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            >
              <h3 className="font-heading text-lg font-semibold text-slate-900">Order Confirmed</h3>
              <p className="mt-1 text-sm text-slate-600">
                {postOrderData?.orderNumber
                  ? `Order ${postOrderData.orderNumber} was placed successfully.`
                  : "Your order was placed successfully."}{" "}
                Download your design previews before finishing.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleDownloadDesigns}
                  disabled={isDownloading}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloading ? "Preparing..." : "Download Design"}
                </button>
                <button
                  type="button"
                  onClick={handleFinishOrder}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Finish
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};

export default CheckoutPage;
