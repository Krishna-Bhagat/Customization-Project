import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useUserAuth } from "../context/UserAuthContext.jsx";
import { writeCustomizationSession } from "../utils/customizationSession.js";
import { readDesignPreviewDataUrl, sanitizeSidePreviewRefs } from "../utils/designPreviewStore.js";
import { formatSideLabel, toSideKey } from "../utils/productSides.js";

const normalizeSides = (item) => {
  const selectedSides = Array.isArray(item?.selectedSides) ? item.selectedSides : [];
  const normalized = selectedSides
    .map((side) => toSideKey(side))
    .filter((side, index, list) => Boolean(side) && list.indexOf(side) === index);

  if (normalized.length > 0) {
    return normalized;
  }

  const previewRefs = sanitizeSidePreviewRefs(item?.customizationState?.sidePreviewRefs || {});
  const refKeys = Object.keys(previewRefs);
  if (refKeys.length > 0) {
    return refKeys;
  }

  return ["front"];
};

const CartPage = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { items, isLoading, subtotal, itemCount, updateCartItem, removeFromCart } = useCart();
  const { isAuthenticated } = useUserAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [previewByItem, setPreviewByItem] = useState({});

  const shipping = 0;
  const total = subtotal + shipping;

  const sortedItems = useMemo(() => [...items], [items]);

  useEffect(() => {
    let active = true;

    const hydratePreviews = async () => {
      const nextMap = {};

      for (const item of sortedItems) {
        const itemId = String(item.id);
        const refs = sanitizeSidePreviewRefs(item?.customizationState?.sidePreviewRefs || {});
        const sideKeys = normalizeSides(item);

        nextMap[itemId] = {};
        for (const sideKey of sideKeys) {
          const ref = refs[sideKey];
          if (!ref) {
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          const dataUrl = await readDesignPreviewDataUrl(ref);
          if (dataUrl) {
            nextMap[itemId][sideKey] = dataUrl;
          }
        }
      }

      if (active) {
        setPreviewByItem(nextMap);
      }
    };

    hydratePreviews();

    return () => {
      active = false;
    };
  }, [sortedItems]);

  const handleQuantityChange = async (itemId, quantity) => {
    try {
      await updateCartItem({ itemId, payload: { quantity } });
    } catch (error) {
      pushToast({
        type: "error",
        message: error.message || "Unable to update cart right now."
      });
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeFromCart(itemId);
    } catch (error) {
      pushToast({
        type: "error",
        message: error.message || "Unable to remove this item right now."
      });
    }
  };

  const handleProceedCheckout = () => {
    if (!isAuthenticated) {
      pushToast({
        type: "info",
        message: "Please login or create an account to continue."
      });
      setIsAuthOpen(true);
      return;
    }
    navigate("/checkout");
  };

  const handleEditDesign = (item) => {
    const productId = Number(item?.productId || item?.product?.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      pushToast({ type: "error", message: "Unable to edit design for this cart item." });
      return;
    }

    const customizationState = item.customizationState || {};
    const selectedSides = normalizeSides(item);
    const activeSide = toSideKey(customizationState.activeSide || selectedSides[0] || "front");
    const sidePreviewRefs = sanitizeSidePreviewRefs(customizationState.sidePreviewRefs || {});

    writeCustomizationSession(productId, {
      selectedSize: item.selectedSize || "",
      quantity: Number(item.quantity || 1),
      selectedSides,
      activeSide,
      source: "cart-edit",
      cartItemId: String(item.id || ""),
      canvasStates: customizationState.canvasStates || {},
      sidePreviewRefs,
      savedAt: Date.now()
    });

    navigate(`/customize/${productId}/workspace`);
  };

  if (isLoading) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      </section>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="Your cart is empty"
          description="Add customized products to cart and continue to checkout."
          action={
            <Link
              to="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Explore Products
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-20">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Cart</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-slate-900">Your Custom Cart</h1>
        <p className="mt-1 text-sm text-slate-600">
          {itemCount} item(s) saved. Review each side preview before checkout.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          {sortedItems.map((item, index) => {
            const sideKeys = normalizeSides(item);
            const sidePreviewMap = previewByItem[String(item.id)] || {};

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft"
              >
                <div className="flex gap-3">
                  <img
                    src={item.previewImage || item.product?.imageUrl}
                    alt={item.product?.name || "Product"}
                    className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate font-heading text-lg font-semibold text-slate-900">
                      {item.product?.name || "Custom Product"}
                    </h3>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                      {item.product?.category || "Product"}
                    </p>
                    <p className="text-sm text-slate-600">
                      Size: <span className="font-semibold text-slate-800">{item.selectedSize || "N/A"}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Sides:{" "}
                      <span className="font-semibold text-slate-800">
                        {sideKeys.map((side) => formatSideLabel(side)).join(", ") || "N/A"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Customized Preview
                  </p>
                  <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {sideKeys.map((side) => {
                      const previewUrl = sidePreviewMap[side] || item.previewImage || item.product?.imageUrl || "";
                      const hasPreviewRef = Boolean(sidePreviewMap[side]);

                      return (
                        <article
                          key={`${item.id}-${side}`}
                          className="min-w-[138px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <div className="relative h-28 w-full bg-slate-100">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={`${item.product?.name || "Product"} ${formatSideLabel(side)}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-semibold text-slate-500">
                                Preview unavailable
                              </div>
                            )}
                            {!hasPreviewRef ? (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Pending
                              </span>
                            ) : null}
                          </div>
                          <div className="border-t border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                            {formatSideLabel(side)}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-xl border border-slate-300">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.id, Math.max(Number(item.quantity || 1) - 1, 1))}
                      className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700"
                    >
                      -
                    </button>
                    <span className="inline-flex min-w-10 items-center justify-center border-x border-slate-300 px-3 text-sm font-semibold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.id, Math.min(Number(item.quantity || 1) + 1, 99))}
                      className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Line Total</p>
                    <p className="text-base font-semibold text-slate-900">
                      NPR {(Number(item.unitPrice || item.product?.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditDesign(item)}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                  >
                    Edit Design
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </motion.article>
            );
          })}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Order Summary</h2>
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

          {!isAuthenticated ? (
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
              Please login or create an account to continue.
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleProceedCheckout}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Proceed to Checkout
          </button>
        </aside>
      </div>

      <AuthModal
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => navigate("/checkout")}
      />
    </section>
  );
};

export default CartPage;
