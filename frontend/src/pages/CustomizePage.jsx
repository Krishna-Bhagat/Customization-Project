import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { createOrder, fetchProducts, uploadDesign } from "../api/index.js";
import FabricDesigner from "../components/FabricDesigner.jsx";
import ProductSkeletonGrid from "../components/ProductSkeletonGrid.jsx";
import { useToast } from "../components/ToastProvider.jsx";

const initialForm = {
  name: "",
  phone: "",
  address: ""
};

const CustomizePage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef(null);
  const { pushToast } = useToast();

  const querySize = searchParams.get("size") || "";

  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [formState, setFormState] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const list = await fetchProducts();
        const foundProduct = list.find((item) => String(item.id) === String(id));
        setProduct(foundProduct || null);

        if (foundProduct) {
          const validSize = (foundProduct.availableSizes || []).includes(querySize) ? querySize : "";
          setSelectedSize(validSize);
        }
      } catch (error) {
        pushToast({ type: "error", message: error.response?.data?.message || "Could not fetch product details." });
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, pushToast, querySize]);

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSizeChange = (value) => {
    setSelectedSize(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("size", value);
    } else {
      params.delete("size");
    }
    setSearchParams(params, { replace: true });
  };

  const handleSubmitOrder = async (event) => {
    event.preventDefault();

    const hasDesign = designerRef.current?.hasAnyDesignElements?.();
    if (!hasDesign) {
      pushToast({ type: "error", message: "Add at least one design element before placing order." });
      return;
    }

    if ((product?.availableSizes || []).length > 0 && !selectedSize) {
      pushToast({ type: "error", message: "Please select a size before placing order." });
      return;
    }

    setIsSubmitting(true);
    try {
      const { frontDesign, backDesign } = designerRef.current.exportDesigns();
      const uploaded = await uploadDesign({ frontDesign, backDesign });

      await createOrder({
        ...formState,
        productId: product.id,
        productName: product.name,
        category: product.category,
        selectedSize,
        frontDesignUrl: uploaded.frontDesignUrl,
        backDesignUrl: uploaded.backDesignUrl
      });

      setFormState(initialForm);
      pushToast({ type: "success", message: "Order submitted successfully. We'll contact you soon." });
    } catch (error) {
      pushToast({ type: "error", message: error.response?.data?.message || "Failed to submit your order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        <ProductSkeletonGrid count={1} />
      </section>
    );
  }

  if (!product) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <h2 className="font-heading text-xl font-semibold text-slate-900">Product not found</h2>
        <p className="mt-2 text-sm text-slate-600">Please go back and choose another product to customize.</p>
        <Link
          to="/products"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Products
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Customize Product</p>
            <h1 className="font-heading text-xl font-semibold text-slate-900">{product.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {product.category} - ${Number(product.price).toFixed(2)}
            </p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
            Back
          </Link>
        </div>

        {(product.availableSizes || []).length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {product.availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeChange(size)}
                className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  selectedSize === size
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <FabricDesigner
        ref={designerRef}
        productImage={product.imageUrl}
        category={product.category}
        onNotify={pushToast}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Order Details</h2>
        <form onSubmit={handleSubmitOrder} className="mt-4 space-y-3">
          <input
            name="name"
            required
            value={formState.name}
            onChange={onFieldChange}
            placeholder="Your name"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <input
            name="phone"
            required
            value={formState.phone}
            onChange={onFieldChange}
            placeholder="Phone number"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
          />
          <textarea
            name="address"
            required
            rows={3}
            value={formState.address}
            onChange={onFieldChange}
            placeholder="Delivery address"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {isSubmitting ? "Submitting..." : "Submit Order"}
          </button>
        </form>
      </section>
    </section>
  );
};

export default CustomizePage;
