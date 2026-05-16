import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createOrder, fetchProducts, uploadDesign } from "../api/index.js";
import EmptyState from "../components/EmptyState.jsx";
import ProductSkeletonGrid from "../components/ProductSkeletonGrid.jsx";
import StepProgress from "../components/StepProgress.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { CANVAS_DIMENSIONS, getPrintableArea } from "../constants/customizer.js";
import {
  clearCustomizationSession,
  readCustomizationSession
} from "../utils/customizationSession.js";
import {
  buildProductSideOptions,
  formatSideLabel,
  getPreviewClassForSide,
  toSideKey
} from "../utils/productSides.js";
import {
  buildDesignFileName,
  composeMockupPreview,
  triggerDownload
} from "../utils/designDownload.js";

const trustBadges = [
  "Secure Checkout",
  "Premium Print Quality",
  "Fast Order Confirmation"
];

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

const ReviewCheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [product, setProduct] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPostOrderPromptOpen, setIsPostOrderPromptOpen] = useState(false);

  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    district: "",
    cityOrVillage: "",
    wardNumber: "",
    addressLine: ""
  });

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

        const session = readCustomizationSession(id) || {};
        const productImages =
          Array.isArray(found.imageUrls) && found.imageUrls.length > 0
            ? found.imageUrls
            : found.imageUrl
              ? [found.imageUrl]
              : [];
        const sideOptions = buildProductSideOptions(found, {
          fallbackImage: productImages[0] || found.imageUrl || ""
        });
        const normalizedSelectedSides = normalizeSelectedSides(session.selectedSides, sideOptions);
        const normalizedDesignExports = Object.entries(session.designExports || {}).reduce(
          (acc, [side, dataUrl]) => {
            const sideKey = toSideKey(side);
            if (!sideKey) {
              return acc;
            }
            acc[sideKey] = dataUrl;
            return acc;
          },
          {}
        );

        setProduct(found);
        setSessionData({
          selectedSize: session.selectedSize || "",
          quantity: Number(session.quantity) > 0 ? Number(session.quantity) : 1,
          selectedSides: normalizedSelectedSides,
          designExports: normalizedDesignExports
        });
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Failed to load checkout information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const selectedSides = sessionData?.selectedSides || ["front"];
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

  const sideOptionByKey = useMemo(
    () =>
      sideOptions.reduce((acc, side) => {
        acc[side.key] = side;
        return acc;
      }, {}),
    [sideOptions]
  );

  const previewSides = useMemo(() => {
    const sideKeys = normalizeSelectedSides(selectedSides, sideOptions);
    const designKeys = Object.keys(sessionData?.designExports || {})
      .map((side) => toSideKey(side))
      .filter((side) => sideOptionByKey[side]);

    designKeys.forEach((side) => {
      if (!sideKeys.includes(side)) {
        sideKeys.push(side);
      }
    });

    return sideKeys.length > 0 ? sideKeys : [sideOptions[0]?.key || "front"];
  }, [selectedSides, sessionData?.designExports, sideOptionByKey, sideOptions]);

  const subtotal = Number(product?.price || 0) * Number(sessionData?.quantity || 1);
  const shipping = 0;
  const total = subtotal + shipping;

  const resolveSidePreviewData = (side) => {
    const sideOption = sideOptionByKey[side];
    const area = sideOption?.printableArea || getPrintableArea(product?.category, side);
    const previewLabel = sideOption?.label || formatSideLabel(side);
    const previewUrl = sessionData?.designExports?.[side] || "";
    const sideImage =
      sideOption?.mockupImage ||
      (side === "front"
        ? productImageList[0] || product?.imageUrl
        : side === "back"
          ? productImageList[1] || productImageList[0] || product?.imageUrl
          : productImageList[2] || productImageList[0] || product?.imageUrl);
    const orientationClass = sideOption?.previewClass || getPreviewClassForSide(side);

    return {
      sideOption,
      area,
      previewLabel,
      previewUrl,
      sideImage,
      orientationClass
    };
  };

  const downloadSidePreview = async (side, { manageLoading = true } = {}) => {
    if (!product || !sessionData) {
      return;
    }

    const { area, previewLabel, previewUrl, sideImage } = resolveSidePreviewData(side);

    if (!previewUrl) {
      pushToast({
        type: "info",
        message: `No saved design found for ${previewLabel}.`
      });
      return;
    }

    if (manageLoading) {
      setIsDownloading(true);
    }
    try {
      const dataUrl = await composeMockupPreview({
        mockupUrl: sideImage,
        designUrl: previewUrl,
        printableArea: area,
        canvasWidth: CANVAS_DIMENSIONS.width,
        canvasHeight: CANVAS_DIMENSIONS.height,
        multiplier: 3
      });

      triggerDownload(
        dataUrl,
        buildDesignFileName({
          productName: product.name,
          sideLabel: previewLabel
        })
      );
    } catch {
      triggerDownload(
        previewUrl,
        buildDesignFileName({
          productName: product.name,
          sideLabel: `${previewLabel}-design-only`
        })
      );
      pushToast({
        type: "info",
        message: `Downloaded design-only file for ${previewLabel} because full preview export was unavailable.`
      });
    } finally {
      if (manageLoading) {
        setIsDownloading(false);
      }
    }
  };

  const downloadAllPreviews = async () => {
    setIsDownloading(true);
    try {
      for (const side of previewSides) {
        // Sequential download keeps mobile browser download behavior stable.
        // eslint-disable-next-line no-await-in-loop
        await downloadSidePreview(side, { manageLoading: false });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const finishOrderFlow = () => {
    clearCustomizationSession(id);
    setIsPostOrderPromptOpen(false);
    navigate("/products");
  };

  const handleSubmitOrder = async (event) => {
    event.preventDefault();

    if (!sessionData || !product) {
      pushToast({ type: "error", message: "Checkout data is incomplete. Please customize again." });
      return;
    }

    const designPayload = Object.entries(sessionData.designExports || {}).reduce((acc, [side, value]) => {
      const sideKey = toSideKey(side);
      if (sideKey && value) {
        acc[sideKey] = value;
      }
      return acc;
    }, {});

    const hasAnyDesign = Object.values(designPayload).some(Boolean);
    if (!hasAnyDesign) {
      pushToast({ type: "error", message: "Please add at least one design before checkout." });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploaded = await uploadDesign({ designs: designPayload });

      const designUrls = uploaded.designUrls || {};
      const normalizedSelectedSides = normalizeSelectedSides(selectedSides, sideOptions);
      const selectedSideLabels = normalizedSelectedSides
        .map((side) => sideOptionByKey[side]?.label || formatSideLabel(side))
        .join(", ");

      const fullAddress = [
        `District: ${formState.district}`,
        `City/Municipality/Village: ${formState.cityOrVillage}`,
        `Ward No: ${formState.wardNumber}`,
        `Address: ${formState.addressLine}`,
        `Quantity: ${sessionData.quantity}`,
        `Print Sides: ${selectedSideLabels}`
      ].join(" | ");

      await createOrder({
        name: formState.name,
        phone: formState.phone,
        address: fullAddress,
        productId: product.id,
        productName: product.name,
        category: product.category,
        selectedSize: sessionData.selectedSize || "",
        selectedSides: normalizedSelectedSides,
        frontDesignUrl: designUrls.front || "",
        backDesignUrl: designUrls.back || "",
        leftSleeveDesignUrl: designUrls["left-sleeve"] || designUrls.leftSleeve || "",
        rightSleeveDesignUrl: designUrls["right-sleeve"] || designUrls.rightSleeve || "",
        designUrls
      });

      pushToast({
        type: "success",
        message: "Order submitted successfully. Download your design before finishing."
      });
      setIsPostOrderPromptOpen(true);
    } catch (error) {
      pushToast({ type: "error", message: error.response?.data?.message || "Failed to place order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 py-3">
        <StepProgress activeStep={4} />
        <div className="mt-3">
          <ProductSkeletonGrid count={1} />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 py-3">
        <EmptyState title="Unable to load checkout" description={errorMessage} />
      </div>
    );
  }

  if (!product || !sessionData) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 py-3">
        <EmptyState
          title="Checkout not ready"
          description="Please customize your product first before checkout."
          action={
            <Link
              to="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Go to Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-3 px-3 py-3 pb-24">
      <header className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Step 4 of 4</p>
            <h1 className="font-heading text-xl font-semibold text-slate-900">Review & Checkout</h1>
          </div>
          <Link
            to={`/customize/${id}/workspace`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit Design
          </Link>
        </div>

        <div className="mt-3">
          <StepProgress activeStep={4} />
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Design Preview</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {previewSides.map((side, index) => {
            const { area, previewLabel, previewUrl, sideImage, orientationClass } =
              resolveSidePreviewData(side);

            return (
              <motion.article
                key={side}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <div className="relative h-44 w-full">
                  <img
                    src={sideImage}
                    alt={`${product.name} ${previewLabel}`}
                    className={`h-full w-full object-contain ${orientationClass}`}
                    loading="lazy"
                  />

                  <div
                    className="pointer-events-none absolute rounded-lg border border-dashed border-brand-500/65 bg-brand-200/20"
                    style={{
                      left: `${(area.left / CANVAS_DIMENSIONS.width) * 100}%`,
                      top: `${(area.top / CANVAS_DIMENSIONS.height) * 100}%`,
                      width: `${(area.width / CANVAS_DIMENSIONS.width) * 100}%`,
                      height: `${(area.height / CANVAS_DIMENSIONS.height) * 100}%`
                    }}
                  />

                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`${previewLabel} design`}
                      className="pointer-events-none absolute object-contain"
                      style={{
                        left: `${(area.left / CANVAS_DIMENSIONS.width) * 100}%`,
                        top: `${(area.top / CANVAS_DIMENSIONS.height) * 100}%`,
                        width: `${(area.width / CANVAS_DIMENSIONS.width) * 100}%`,
                        height: `${(area.height / CANVAS_DIMENSIONS.height) * 100}%`
                      }}
                    />
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-semibold text-slate-700">{previewLabel}</span>
                  <button
                    type="button"
                    onClick={() => downloadSidePreview(side)}
                    disabled={isDownloading || !previewUrl}
                    className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-300 px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
        <button
          type="button"
          onClick={downloadAllPreviews}
          disabled={isDownloading}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloading ? "Preparing Downloads..." : "Download All Previews"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Order Summary</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Product</span>
            <span className="font-semibold text-slate-800">{product.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Category</span>
            <span className="font-semibold text-slate-800">{product.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Size</span>
            <span className="font-semibold text-slate-800">{sessionData.selectedSize || "Not selected"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Quantity</span>
            <span className="font-semibold text-slate-800">{sessionData.quantity}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Print Sides</span>
            <span className="text-right text-xs font-semibold text-slate-800">
              {normalizeSelectedSides(selectedSides, sideOptions)
                .map((side) => sideOptionByKey[side]?.label || formatSideLabel(side))
                .join(", ")}
            </span>
          </div>
          <div className="mt-2 border-t border-slate-200 pt-2">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Delivery Details</h2>
        <form onSubmit={handleSubmitOrder} className="mt-3 space-y-3">
          <input
            required
            name="name"
            value={formState.name}
            onChange={handleFieldChange}
            placeholder="Full name"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <input
            required
            name="phone"
            value={formState.phone}
            onChange={handleFieldChange}
            placeholder="Phone number"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <input
            required
            name="district"
            value={formState.district}
            onChange={handleFieldChange}
            placeholder="District"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <input
            required
            name="cityOrVillage"
            value={formState.cityOrVillage}
            onChange={handleFieldChange}
            placeholder="City / Municipality / Village"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <input
            required
            name="wardNumber"
            value={formState.wardNumber}
            onChange={handleFieldChange}
            placeholder="Ward number"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <textarea
            required
            name="addressLine"
            value={formState.addressLine}
            onChange={handleFieldChange}
            rows={3}
            placeholder="Street, landmark, house details"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Submitting Order..." : "Place Order"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 via-slate-50 to-cyan-50 p-3 shadow-soft">
        <h2 className="font-heading text-base font-semibold text-slate-900">Why customers trust us</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {trustBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {isPostOrderPromptOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-900/60 px-4"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-4 bottom-4 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            >
              <h3 className="font-heading text-lg font-semibold text-slate-900">Order Confirmed</h3>
              <p className="mt-1 text-sm text-slate-600">
                Download your design previews before finishing. Your local draft will be cleared when you finish.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={downloadAllPreviews}
                  disabled={isDownloading}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloading ? "Preparing..." : "Download Design"}
                </button>
                <button
                  type="button"
                  onClick={finishOrderFlow}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Finish
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default ReviewCheckoutPage;
