import { useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  fetchAdminOrders,
  fetchAdminOrderStats,
  fetchCategories,
  fetchProducts,
  updateAdminOrderStatus,
  updateProduct,
  updateCategory
} from "../api/index.js";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminTopbar from "../components/AdminTopbar.jsx";
import CategoryBadge from "../components/CategoryBadge.jsx";
import Loader from "../components/Loader.jsx";
import PrintableAreaSelector from "../components/PrintableAreaSelector.jsx";
import SizeChips from "../components/SizeChips.jsx";
import StatCard from "../components/StatCard.jsx";
import { useToast } from "../../components/ToastProvider.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { SIDE_SUGGESTIONS, SIZE_SUGGESTIONS } from "../constants/productMeta.js";

const DEFAULT_PRINTABLE_AREA = {
  x: 90,
  y: 108,
  width: 150,
  height: 198
};

const DEFAULT_SIDE_PRINTABLE_PRESETS = {
  front: { x: 92, y: 108, width: 146, height: 196 },
  back: { x: 92, y: 108, width: 146, height: 196 },
  sleeve: { x: 118, y: 148, width: 90, height: 118 },
  "left-sleeve": { x: 118, y: 148, width: 90, height: 118 },
  "right-sleeve": { x: 118, y: 148, width: 90, height: 118 }
};

const initialForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  searchSlugs: [],
  galleryImages: [],
  existingGalleryImages: [],
  availableSizes: [],
  enabledSides: [],
  sideConfigByKey: {}
};

const makeSideKey = (value) =>
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ORDER_RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Orders" }
];

const ORDER_STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-blue-200 bg-blue-50 text-blue-700",
  dispatched: "border-violet-200 bg-violet-50 text-violet-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

const formatOrderDate = (value) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const getNextOrderAction = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending") {
    return { nextStatus: "confirmed", label: "Confirm Order" };
  }
  if (normalized === "confirmed") {
    return { nextStatus: "dispatched", label: "Dispatch Order" };
  }
  if (normalized === "dispatched") {
    return { nextStatus: "delivered", label: "Mark Delivered" };
  }
  return null;
};

const getDefaultPrintableAreaForSide = (sideName) => {
  const sideKey = makeSideKey(sideName);
  const preset =
    DEFAULT_SIDE_PRINTABLE_PRESETS[sideKey] ||
    ((sideKey === "left-sleeve" || sideKey === "right-sleeve") && DEFAULT_SIDE_PRINTABLE_PRESETS.sleeve) ||
    DEFAULT_PRINTABLE_AREA;

  return {
    x: preset.x,
    y: preset.y,
    width: preset.width,
    height: preset.height
  };
};

const GALLERY_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".webp", ".heic", ".heif"];
const MOCKUP_ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"];

const getExtension = (fileName) => {
  const index = String(fileName || "").lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return String(fileName).slice(index).toLowerCase();
};

const isAllowedFile = (file, allowedExtensions) => allowedExtensions.includes(getExtension(file?.name));

const formatAllowedExtensions = (extensions) => extensions.map((item) => item.replace(".", "").toUpperCase()).join(", ");

const formatSideLabel = (value) =>
  String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const normalizeSizeToken = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-/ ]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 24);

const normalizeSideToken = (value) => formatSideLabel(value).slice(0, 60);

const normalizeSearchSlugToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const uniqueByCaseInsensitive = (items) => {
  const map = new Map();
  (items || []).forEach((item) => {
    const token = String(item || "").trim();
    if (!token) {
      return;
    }
    const key = token.toLowerCase();
    if (!map.has(key)) {
      map.set(key, token);
    }
  });
  return Array.from(map.values());
};

const syncSideConfigBySides = (sides, existingConfig = {}) =>
  (sides || []).reduce((acc, sideName) => {
    const sideKey = makeSideKey(sideName);
    const existing = existingConfig?.[sideKey] || {};
    const defaultArea = getDefaultPrintableAreaForSide(sideName);

    acc[sideKey] = {
      sideName,
      x: Number(existing.x ?? defaultArea.x),
      y: Number(existing.y ?? defaultArea.y),
      width: Number(existing.width ?? defaultArea.width),
      height: Number(existing.height ?? defaultArea.height),
      mockupFile: existing.mockupFile || null,
      mockupImageUrl: existing.mockupImageUrl || ""
    };

    return acc;
  }, {});

const getCategoryByName = (categories, categoryName) =>
  categories.find((category) => category.name.toLowerCase() === String(categoryName || "").toLowerCase());

const getProductImages = (product) => {
  if (Array.isArray(product?.galleryImages) && product.galleryImages.length > 0) {
    return product.galleryImages;
  }
  if (Array.isArray(product?.imageUrls) && product.imageUrls.length > 0) {
    return product.imageUrls;
  }
  return product?.imageUrl ? [product.imageUrl] : [];
};

const ProductSideChips = ({ sides = [] }) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {sides.map((side) => (
      <span
        key={side.sideKey || side.sideName}
        className="inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700"
      >
        {side.sideName}
      </span>
    ))}
  </div>
);

const OrderStatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const style = ORDER_STATUS_STYLES[normalized] || ORDER_STATUS_STYLES.pending;

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${style}`}>
      {normalized || "pending"}
    </span>
  );
};

const TagEditor = ({
  title,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  suggestions = [],
  tone = "teal"
}) => {
  const toneClasses =
    tone === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-teal-200 bg-teal-50 text-teal-700";

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {(items || []).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onRemove(item)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-85 ${toneClasses}`}
          >
            <span>{item}</span>
            <span aria-hidden>x</span>
          </button>
        ))}
        {(items || []).length === 0 ? (
          <span className="text-xs text-slate-400">No items yet.</span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd(inputValue);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
        />
        <button
          type="button"
          onClick={() => onAdd(inputValue)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Add
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onAdd(suggestion)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SideConfigCard = ({ sideName, config, onFileChange, onAreaChange }) => (
  <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <h5 className="text-sm font-semibold text-slate-800">{sideName}</h5>
    <label className="mt-2 block text-xs font-medium text-slate-600">
      Side mockup image
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif"
        onChange={(event) => onFileChange(sideName, event.target.files?.[0] || null)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
      />
      <span className="mt-1 block text-[11px] text-slate-500">PNG recommended for mockup images.</span>
      {config.mockupFile ? <span className="mt-1 block text-[11px] text-slate-500">{config.mockupFile.name}</span> : null}
      {!config.mockupFile && config.mockupImageUrl ? (
        <span className="mt-1 block text-[11px] text-slate-500">Using saved mockup image.</span>
      ) : null}
    </label>

    <PrintableAreaSelector
      file={config.mockupFile}
      imageUrl={config.mockupImageUrl}
      area={config}
      onChange={(nextArea) => onAreaChange(sideName, nextArea)}
    />
  </article>
);

const AdminDashboardPage = () => {
  const { token, logout } = useAdminAuth();
  const { pushToast } = useToast();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderRange, setOrderRange] = useState("all");
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStats, setOrderStats] = useState({
    ordersToday: 0,
    ordersThisWeek: 0,
    pendingOrders: 0
  });
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [activeOrderAction, setActiveOrderAction] = useState("");
  const [formState, setFormState] = useState(initialForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [categoryInputDrafts, setCategoryInputDrafts] = useState({});

  const [newCategory, setNewCategory] = useState({
    name: "",
    supportsSizes: true,
    allowedSizes: ["M", "L", "XL"],
    customizationSides: ["Front", "Back"]
  });
  const [newCategoryInputs, setNewCategoryInputs] = useState({
    sizeInput: "",
    sideInput: ""
  });
  const [searchSlugInput, setSearchSlugInput] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCategory = useMemo(
    () => getCategoryByName(categories, formState.category),
    [categories, formState.category]
  );

  const isEditMode = Boolean(editingProductId);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      const [productList, categoryList, statsResponse, orderResponse] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchAdminOrderStats({ token }),
        fetchAdminOrders({ token, range: orderRange, search: orderSearch })
      ]);
      setProducts(productList);
      setCategories(categoryList);
      setOrderStats({
        ordersToday: Number(statsResponse?.ordersToday || 0),
        ordersThisWeek: Number(statsResponse?.ordersThisWeek || 0),
        pendingOrders: Number(statsResponse?.pendingOrders || 0)
      });
      setOrders(orderResponse?.orders || []);

      setCategoryDrafts(
        categoryList.reduce((acc, category) => {
          acc[category.id] = {
            name: category.name,
            supportsSizes: category.supportsSizes,
            allowedSizes: [...(category.allowedSizes || [])],
            customizationSides: [...(category.customizationSides || ["Front", "Back"])]
          };
          return acc;
        }, {})
      );

      setCategoryInputDrafts(
        categoryList.reduce((acc, category) => {
          acc[category.id] = {
            sizeInput: "",
            sideInput: ""
          };
          return acc;
        }, {})
      );

      setFormState((prev) => {
        const resolvedCategory =
          getCategoryByName(categoryList, prev.category) ||
          categoryList[0] || {
            name: "",
            supportsSizes: true,
            allowedSizes: [],
            customizationSides: ["Front", "Back"]
          };

        const categorySides = resolvedCategory.customizationSides || ["Front", "Back"];
        const enabledSides =
          prev.enabledSides.filter((side) => categorySides.includes(side)).length > 0
            ? prev.enabledSides.filter((side) => categorySides.includes(side))
            : [...categorySides];

        const availableSizes = resolvedCategory.supportsSizes
          ? prev.availableSizes.filter((size) => (resolvedCategory.allowedSizes || []).includes(size))
          : [];

        return {
          ...prev,
          category: resolvedCategory.name,
          enabledSides,
          availableSizes,
          sideConfigByKey: syncSideConfigBySides(enabledSides, prev.sideConfigByKey)
        };
      });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load admin dashboard data.";
      setErrorMessage(message);
      pushToast({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeSection !== "orders") {
      return;
    }
    loadOrders({ silent: true });
    loadOrderStats({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const loadOrders = async ({ range = orderRange, search = orderSearch, silent = false } = {}) => {
    if (!silent) {
      setIsOrdersLoading(true);
    }

    try {
      const response = await fetchAdminOrders({
        token,
        range,
        search
      });
      setOrders(response?.orders || []);
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load orders.";
      pushToast({ type: "error", message });
    } finally {
      if (!silent) {
        setIsOrdersLoading(false);
      }
    }
  };

  const loadOrderStats = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsOrdersLoading(true);
    }

    try {
      const stats = await fetchAdminOrderStats({ token });
      setOrderStats({
        ordersToday: Number(stats?.ordersToday || 0),
        ordersThisWeek: Number(stats?.ordersThisWeek || 0),
        pendingOrders: Number(stats?.pendingOrders || 0)
      });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load order stats.";
      pushToast({ type: "error", message });
    } finally {
      if (!silent) {
        setIsOrdersLoading(false);
      }
    }
  };

  const clearNotices = () => {
    setErrorMessage("");
  };

  const notifyError = (message) => {
    const finalMessage = String(message || "Something went wrong.");
    setErrorMessage(finalMessage);
    pushToast({ type: "error", message: finalMessage });
  };

  const notifySuccess = (message) => {
    const finalMessage = String(message || "Completed successfully.");
    setErrorMessage("");
    pushToast({ type: "success", message: finalMessage });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (event) => {
    const selectedCategoryName = event.target.value;
    const category = getCategoryByName(categories, selectedCategoryName);

    setFormState((prev) => {
      const categorySides = category?.customizationSides || ["Front", "Back"];
      const enabledSides =
        prev.enabledSides.filter((side) => categorySides.includes(side)).length > 0
          ? prev.enabledSides.filter((side) => categorySides.includes(side))
          : [...categorySides];

      return {
        ...prev,
        category: selectedCategoryName,
        availableSizes: category?.supportsSizes
          ? prev.availableSizes.filter((size) => (category.allowedSizes || []).includes(size))
          : [],
        enabledSides,
        sideConfigByKey: syncSideConfigBySides(enabledSides, prev.sideConfigByKey)
      };
    });
  };

  const handleGalleryImagesChange = (event) => {
    clearNotices();
    const selectedFiles = Array.from(event.target.files || []);
    const invalidFile = selectedFiles.find((file) => !isAllowedFile(file, GALLERY_ALLOWED_EXTENSIONS));

    if (invalidFile) {
      notifyError(
        `Unsupported gallery format (${invalidFile.name}). Allowed: ${formatAllowedExtensions(
          GALLERY_ALLOWED_EXTENSIONS
        )}.`
      );
      event.target.value = "";
      return;
    }

    setFormState((prev) => ({
      ...prev,
      galleryImages: selectedFiles
    }));
  };

  const addSearchSlug = (rawValue) => {
    const token = normalizeSearchSlugToken(rawValue);
    if (!token) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      searchSlugs: uniqueByCaseInsensitive([...(prev.searchSlugs || []), token])
    }));
    setSearchSlugInput("");
  };

  const removeSearchSlug = (token) => {
    setFormState((prev) => ({
      ...prev,
      searchSlugs: (prev.searchSlugs || []).filter((item) => item !== token)
    }));
  };

  const toggleProductSize = (size) => {
    if (!selectedCategory?.supportsSizes) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      availableSizes: prev.availableSizes.includes(size)
        ? prev.availableSizes.filter((item) => item !== size)
        : [...prev.availableSizes, size]
    }));
  };

  const toggleEnabledSide = (sideName) => {
    setFormState((prev) => {
      const nextEnabledSides = prev.enabledSides.includes(sideName)
        ? prev.enabledSides.filter((item) => item !== sideName)
        : [...prev.enabledSides, sideName];

      return {
        ...prev,
        enabledSides: nextEnabledSides,
        sideConfigByKey: syncSideConfigBySides(nextEnabledSides, prev.sideConfigByKey)
      };
    });
  };

  const handleSideMockupChange = (sideName, file) => {
    clearNotices();
    const sideKey = makeSideKey(sideName);
    const defaultArea = getDefaultPrintableAreaForSide(sideName);

    if (file && !isAllowedFile(file, MOCKUP_ALLOWED_EXTENSIONS)) {
      notifyError(
        `Unsupported mockup format (${file.name}). Allowed: ${formatAllowedExtensions(
          MOCKUP_ALLOWED_EXTENSIONS
        )}.`
      );
      return;
    }

    setFormState((prev) => ({
      ...prev,
      sideConfigByKey: {
        ...prev.sideConfigByKey,
        [sideKey]: {
          ...(prev.sideConfigByKey[sideKey] || {
            sideName,
            ...defaultArea
          }),
          sideName,
          mockupFile: file
        }
      }
    }));
  };

  const handlePrintableAreaChange = (sideName, nextArea) => {
    const sideKey = makeSideKey(sideName);
    const defaultArea = getDefaultPrintableAreaForSide(sideName);
    const normalized = {
      x: Number.isFinite(Number(nextArea?.x)) ? Number(nextArea.x) : defaultArea.x,
      y: Number.isFinite(Number(nextArea?.y)) ? Number(nextArea.y) : defaultArea.y,
      width: Number.isFinite(Number(nextArea?.width)) ? Number(nextArea.width) : defaultArea.width,
      height: Number.isFinite(Number(nextArea?.height)) ? Number(nextArea.height) : defaultArea.height
    };

    setFormState((prev) => ({
      ...prev,
      sideConfigByKey: {
        ...prev.sideConfigByKey,
        [sideKey]: {
          ...(prev.sideConfigByKey[sideKey] || {
            sideName,
            ...defaultArea,
            mockupFile: null
          }),
          ...normalized
        }
      }
    }));
  };

  const handleEditProduct = (product) => {
    clearNotices();

    const category = getCategoryByName(categories, product.category);
    const categorySides = category?.customizationSides || ["Front", "Back"];
    const existingSides = Array.isArray(product?.sides) ? product.sides : [];
    const enabledSides =
      existingSides.length > 0
        ? existingSides.map((side) => side.sideName).filter(Boolean)
        : [...categorySides];

    const sideConfigByKey = enabledSides.reduce((acc, sideName) => {
      const sideKey = makeSideKey(sideName);
      const sideRow = existingSides.find((item) => makeSideKey(item.sideKey || item.sideName) === sideKey);
      const defaultArea = getDefaultPrintableAreaForSide(sideName);
      const printableArea = sideRow?.printableArea || defaultArea;

      acc[sideKey] = {
        sideName,
        x: Number(printableArea?.x ?? defaultArea.x),
        y: Number(printableArea?.y ?? defaultArea.y),
        width: Number(printableArea?.width ?? defaultArea.width),
        height: Number(printableArea?.height ?? defaultArea.height),
        mockupFile: null,
        mockupImageUrl: sideRow?.mockupImage || ""
      };
      return acc;
    }, {});

    setEditingProductId(product.id);
    setFormState({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      category: product.category || category?.name || "",
      searchSlugs: Array.isArray(product.searchSlugs) ? product.searchSlugs : [],
      galleryImages: [],
      existingGalleryImages: getProductImages(product),
      availableSizes: Array.isArray(product.availableSizes) ? product.availableSizes : [],
      enabledSides,
      sideConfigByKey
    });
    setSearchSlugInput("");
    setActiveSection("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    clearNotices();
    setEditingProductId(null);
    setSearchSlugInput("");
    setFormState((prev) => {
      const category = getCategoryByName(categories, prev.category);
      const defaultSides = category?.customizationSides || ["Front", "Back"];
      return {
        ...initialForm,
        category: prev.category,
        enabledSides: [...defaultSides],
        sideConfigByKey: syncSideConfigBySides(defaultSides)
      };
    });
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();
    clearNotices();

    if (!formState.name || !formState.price || !formState.category) {
      notifyError("Name, category and price are required.");
      return;
    }

    if (formState.enabledSides.length === 0) {
      notifyError("Select at least one customization side.");
      return;
    }

    if (
      formState.galleryImages.length === 0 &&
      (!isEditMode || formState.existingGalleryImages.length === 0)
    ) {
      notifyError("Upload at least one customer gallery image.");
      return;
    }

    if (selectedCategory?.supportsSizes && formState.availableSizes.length === 0) {
      notifyError("Select at least one size for this product.");
      return;
    }

    for (const sideName of formState.enabledSides) {
      const sideKey = makeSideKey(sideName);
      const sideConfig = formState.sideConfigByKey[sideKey];
      if (!sideConfig?.mockupFile && !sideConfig?.mockupImageUrl) {
        notifyError(`Upload mockup image for ${sideName}.`);
        return;
      }
    }

    const payload = new FormData();
    payload.append("name", formState.name.trim());
    payload.append("description", formState.description.trim());
    payload.append("price", formState.price);
    payload.append("category", formState.category);
    payload.append("availableSizes", JSON.stringify(formState.availableSizes));
    payload.append("enabledSides", JSON.stringify(formState.enabledSides));
    payload.append("searchSlugs", JSON.stringify(formState.searchSlugs || []));

    const sideConfigPayload = {};

    formState.enabledSides.forEach((sideName) => {
      const sideKey = makeSideKey(sideName);
      const defaultArea = getDefaultPrintableAreaForSide(sideName);
      const config = formState.sideConfigByKey[sideKey] || {
        ...defaultArea,
        mockupFile: null
      };

      sideConfigPayload[sideKey] = {
        x: Number(config.x) || defaultArea.x,
        y: Number(config.y) || defaultArea.y,
        width: Number(config.width) || defaultArea.width,
        height: Number(config.height) || defaultArea.height
      };

      if (config.mockupFile) {
        payload.append(`sideMockup_${sideKey}`, config.mockupFile);
      }
    });

    payload.append("sideConfigs", JSON.stringify(sideConfigPayload));

    formState.galleryImages.forEach((file) => {
      payload.append("galleryImages", file);
    });

    setIsSaving(true);

    try {
      if (isEditMode) {
        await updateProduct({ token, productId: editingProductId, formData: payload });
        notifySuccess("Product updated successfully.");
      } else {
        await createProduct({ token, formData: payload });
        notifySuccess("Product added successfully.");
      }

      setEditingProductId(null);
      setFormState((prev) => {
        const category = getCategoryByName(categories, prev.category);
        const defaultSides = category?.customizationSides || ["Front", "Back"];

        return {
          ...initialForm,
          category: prev.category,
          enabledSides: [...defaultSides],
          sideConfigByKey: syncSideConfigBySides(defaultSides),
          availableSizes: []
        };
      });
      setSearchSlugInput("");

      await loadDashboardData();
    } catch (error) {
      notifyError(error.response?.data?.message || "Failed to add product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    clearNotices();

    try {
      await deleteProduct({ token, productId });
      notifySuccess("Product deleted.");
      await loadDashboardData();
    } catch (error) {
      notifyError(error.response?.data?.message || "Failed to delete product.");
    }
  };

  const setCategoryDraft = (categoryId, updater) => {
    setCategoryDrafts((prev) => ({
      ...prev,
      [categoryId]: updater(prev[categoryId])
    }));
  };

  const setCategoryDraftInput = (categoryId, field, value) => {
    setCategoryInputDrafts((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || { sizeInput: "", sideInput: "" }),
        [field]: value
      }
    }));
  };

  const addCategoryDraftSize = (categoryId, rawValue) => {
    const token = normalizeSizeToken(rawValue);
    if (!token) {
      return;
    }

    setCategoryDraft(categoryId, (draft) => ({
      ...draft,
      allowedSizes: uniqueByCaseInsensitive([...(draft?.allowedSizes || []), token])
    }));

    setCategoryDraftInput(categoryId, "sizeInput", "");
  };

  const removeCategoryDraftSize = (categoryId, size) => {
    setCategoryDraft(categoryId, (draft) => ({
      ...draft,
      allowedSizes: (draft?.allowedSizes || []).filter((item) => item !== size)
    }));
  };

  const addCategoryDraftSide = (categoryId, rawValue) => {
    const token = normalizeSideToken(rawValue);
    if (!token) {
      return;
    }

    setCategoryDraft(categoryId, (draft) => ({
      ...draft,
      customizationSides: uniqueByCaseInsensitive([...(draft?.customizationSides || []), token])
    }));

    setCategoryDraftInput(categoryId, "sideInput", "");
  };

  const removeCategoryDraftSide = (categoryId, side) => {
    setCategoryDraft(categoryId, (draft) => ({
      ...draft,
      customizationSides: (draft?.customizationSides || []).filter((item) => item !== side)
    }));
  };

  const handleSaveCategory = async (categoryId) => {
    const draft = categoryDrafts[categoryId];
    if (!draft) {
      return;
    }

    clearNotices();

    if (!draft.name.trim()) {
      notifyError("Category name is required.");
      return;
    }

    if (draft.supportsSizes && draft.allowedSizes.length === 0) {
      notifyError("Select at least one allowed size for this category.");
      return;
    }

    if (draft.customizationSides.length === 0) {
      notifyError("Select at least one customization side for this category.");
      return;
    }

    try {
      await updateCategory({
        token,
        categoryId,
        payload: {
          name: draft.name.trim(),
          supportsSizes: draft.supportsSizes,
          allowedSizes: draft.supportsSizes ? draft.allowedSizes : [],
          customizationSides: draft.customizationSides
        }
      });

      notifySuccess("Category updated.");
      await loadDashboardData();
    } catch (error) {
      notifyError(error.response?.data?.message || "Failed to update category.");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    clearNotices();

    try {
      await deleteCategory({ token, categoryId });
      notifySuccess("Category deleted.");
      await loadDashboardData();
    } catch (error) {
      notifyError(error.response?.data?.message || "Failed to delete category.");
    }
  };

  const addNewCategorySize = (rawValue) => {
    const token = normalizeSizeToken(rawValue);
    if (!token) {
      return;
    }

    setNewCategory((prev) => ({
      ...prev,
      allowedSizes: uniqueByCaseInsensitive([...(prev.allowedSizes || []), token])
    }));

    setNewCategoryInputs((prev) => ({ ...prev, sizeInput: "" }));
  };

  const removeNewCategorySize = (size) => {
    setNewCategory((prev) => ({
      ...prev,
      allowedSizes: (prev.allowedSizes || []).filter((item) => item !== size)
    }));
  };

  const addNewCategorySide = (rawValue) => {
    const token = normalizeSideToken(rawValue);
    if (!token) {
      return;
    }

    setNewCategory((prev) => ({
      ...prev,
      customizationSides: uniqueByCaseInsensitive([...(prev.customizationSides || []), token])
    }));

    setNewCategoryInputs((prev) => ({ ...prev, sideInput: "" }));
  };

  const removeNewCategorySide = (side) => {
    setNewCategory((prev) => ({
      ...prev,
      customizationSides: (prev.customizationSides || []).filter((item) => item !== side)
    }));
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    clearNotices();

    if (!newCategory.name.trim()) {
      notifyError("Category name is required.");
      return;
    }

    if (newCategory.supportsSizes && newCategory.allowedSizes.length === 0) {
      notifyError("Select at least one size for category.");
      return;
    }

    if (newCategory.customizationSides.length === 0) {
      notifyError("Select at least one customization side for category.");
      return;
    }

    try {
      await createCategory({
        token,
        payload: {
          name: newCategory.name.trim(),
          supportsSizes: newCategory.supportsSizes,
          allowedSizes: newCategory.supportsSizes ? newCategory.allowedSizes : [],
          customizationSides: newCategory.customizationSides
        }
      });

      notifySuccess("Category created.");
      setNewCategory({
        name: "",
        supportsSizes: true,
        allowedSizes: ["M", "L", "XL"],
        customizationSides: ["Front", "Back"]
      });
      setNewCategoryInputs({ sizeInput: "", sideInput: "" });
      await loadDashboardData();
    } catch (error) {
      notifyError(error.response?.data?.message || "Failed to create category.");
    }
  };

  const handleApplyOrderSearch = async (event) => {
    event.preventDefault();
    const normalizedSearch = orderSearchInput.trim();
    setOrderSearch(normalizedSearch);
    await loadOrders({ range: orderRange, search: normalizedSearch });
  };

  const handleSelectOrderRange = async (range) => {
    const normalizedRange = String(range || "all");
    setOrderRange(normalizedRange);
    await loadOrders({ range: normalizedRange, search: orderSearch });
  };

  const handleOrderStatusUpdate = async ({ orderId, status }) => {
    setActiveOrderAction(`${orderId}-${status}`);
    try {
      const response = await updateAdminOrderStatus({
        token,
        orderId,
        status
      });
      notifySuccess(response?.message || "Order status updated.");
      await Promise.all([
        loadOrders({ range: orderRange, search: orderSearch, silent: true }),
        loadOrderStats({ silent: true })
      ]);
    } catch (error) {
      notifyError(error.response?.data?.message || "Failed to update order status.");
    } finally {
      setActiveOrderAction("");
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        const categoryMatch = categoryFilter ? product.category === categoryFilter : true;
        return nameMatch && categoryMatch;
      }),
    [products, searchTerm, categoryFilter]
  );

  const dashboardStats = useMemo(() => {
    const totalProducts = products.length;
    const totalCategories = categories.length;
    const ordersToday = Number(orderStats.ordersToday || 0);
    const ordersThisWeek = Number(orderStats.ordersThisWeek || 0);
    const pendingOrders = Number(orderStats.pendingOrders || 0);

    return {
      totalProducts,
      totalCategories,
      ordersToday,
      ordersThisWeek,
      pendingOrders
    };
  }, [categories, orderStats, products]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <AdminSidebar activeSection={activeSection} onSelectSection={setActiveSection} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar activeSection={activeSection} onSelectSection={setActiveSection} onLogout={logout} />

          <main className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="card p-6">
                <Loader label="Loading dashboard..." />
              </div>
            ) : null}

            {!isLoading && activeSection === "dashboard" ? (
              <section className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard title="Orders Today" value={dashboardStats.ordersToday} hint="Orders placed today" />
                  <StatCard title="Orders This Week" value={dashboardStats.ordersThisWeek} hint="Weekly order volume" tone="blue" />
                  <StatCard title="Pending Orders" value={dashboardStats.pendingOrders} hint="Need action from admin" tone="amber" />
                  <StatCard title="Total Products" value={dashboardStats.totalProducts} hint={`${dashboardStats.totalCategories} categories`} tone="purple" />
                </div>

                <section className="card p-6">
                  <h3 className="font-heading text-xl font-semibold text-slate-900">Recent Products</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {products.slice(0, 6).map((product) => {
                      const productImages = getProductImages(product);
                      return (
                        <article key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <img src={productImages[0]} alt={product.name} className="h-40 w-full rounded-lg object-cover" loading="lazy" />
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <h4 className="font-heading text-base font-semibold text-slate-900">{product.name}</h4>
                            <CategoryBadge category={product.category} />
                          </div>
                          {product.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>
                          ) : null}
                          <p className="mt-1 text-sm font-semibold text-slate-700">NPR {Number(product.price).toFixed(2)}</p>
                          {(product.searchSlugs || []).length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(product.searchSlugs || []).slice(0, 4).map((slug) => (
                                <span
                                  key={slug}
                                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                >
                                  {slug}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <SizeChips sizes={product.availableSizes} />
                          <ProductSideChips sides={product.sides || []} />
                        </article>
                      );
                    })}
                  </div>
                </section>
              </section>
            ) : null}

            {!isLoading && activeSection === "products" ? (
              <section className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
                <section className="card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-xl font-semibold text-slate-900">
                      {isEditMode ? "Edit Product" : "Add Product"}
                    </h3>
                    {isEditMode ? (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                  <form className="mt-5 space-y-4" onSubmit={handleAddProduct}>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Name</span>
                      <input name="name" value={formState.name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring" />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Description (Optional)</span>
                      <textarea
                        name="description"
                        rows={3}
                        value={formState.description}
                        onChange={handleInputChange}
                        placeholder="Material, fit, GSM, wash care, and product highlights."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Category</span>
                        <select value={formState.category} onChange={handleCategoryChange} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring">
                          {categories.map((category) => (
                            <option key={category.id} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Price (NPR)</span>
                        <input name="price" type="number" min="0" step="0.01" value={formState.price} onChange={handleInputChange} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring" />
                      </label>
                    </div>

                    <TagEditor
                      title="Search Slugs (for product search)"
                      items={formState.searchSlugs || []}
                      inputValue={searchSlugInput}
                      onInputChange={setSearchSlugInput}
                      onAdd={addSearchSlug}
                      onRemove={removeSearchSlug}
                      placeholder="Example: krishna-tee"
                      suggestions={[
                        normalizeSearchSlugToken(formState.name),
                        normalizeSearchSlugToken(formState.category)
                      ].filter(Boolean)}
                    />

                    {selectedCategory?.supportsSizes ? (
                      <section className="block text-sm">
                        <span className="mb-2 block font-medium text-slate-700">Available Sizes</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(selectedCategory?.allowedSizes || []).map((size) => (
                            <div key={size} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                              <input
                                id={`product-size-${size}`}
                                type="checkbox"
                                checked={formState.availableSizes.includes(size)}
                                onChange={() => toggleProductSize(size)}
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <label htmlFor={`product-size-${size}`} className="cursor-pointer text-xs font-semibold text-slate-700">
                                {size}
                              </label>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Sizes are disabled for this category.
                      </div>
                    )}

                    <section className="block text-sm">
                      <span className="mb-2 block font-medium text-slate-700">Enabled Customization Sides</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(selectedCategory?.customizationSides || ["Front", "Back"]).map((sideName) => (
                          <div key={sideName} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                            <input
                              id={`product-side-${makeSideKey(sideName)}`}
                              type="checkbox"
                              checked={formState.enabledSides.includes(sideName)}
                              onChange={() => toggleEnabledSide(sideName)}
                              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <label htmlFor={`product-side-${makeSideKey(sideName)}`} className="cursor-pointer text-xs font-semibold text-slate-700">
                              {sideName}
                            </label>
                          </div>
                        ))}
                      </div>
                    </section>

                    {formState.enabledSides.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Customization Mockups</p>
                        <p className="text-xs text-slate-500">
                          These images are used only in the customization editor. Draw printable area visually on each side.
                        </p>
                        {formState.enabledSides.map((sideName) => {
                          const sideKey = makeSideKey(sideName);
                          const defaultArea = getDefaultPrintableAreaForSide(sideName);
                          const config = formState.sideConfigByKey[sideKey] || {
                            sideName,
                            ...defaultArea,
                            mockupFile: null
                          };

                          return (
                            <SideConfigCard
                              key={sideKey}
                              sideName={sideName}
                              config={config}
                              onFileChange={handleSideMockupChange}
                              onAreaChange={handlePrintableAreaChange}
                            />
                          );
                        })}
                      </div>
                    ) : null}

                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Customer Gallery Images</span>
                      <span className="mb-2 block text-xs text-slate-500">
                        {isEditMode
                          ? "Optional in edit mode. Upload to replace current storefront gallery images."
                          : "Required. These images are shown to customers in storefront and product pages (JPG, JPEG, WEBP, HEIC)."}
                      </span>
                      <input type="file" multiple accept=".jpg,.jpeg,.webp,.heic,.heif,image/jpeg,image/webp,image/heic,image/heif" onChange={handleGalleryImagesChange} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                      {formState.galleryImages.length === 0 && formState.existingGalleryImages.length > 0 ? (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {formState.existingGalleryImages.slice(0, 8).map((imageUrl, imageIndex) => (
                            <img
                              key={`${imageUrl}-${imageIndex}`}
                              src={imageUrl}
                              alt={`Existing gallery ${imageIndex + 1}`}
                              className="h-14 w-full rounded-lg border border-slate-200 object-cover"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      ) : null}
                      {formState.galleryImages.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {formState.galleryImages.map((file) => (
                            <span key={`${file.name}-${file.size}`} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {file.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </label>

                    <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300">
                      {isSaving ? "Saving..." : isEditMode ? "Update Product" : "Add Product"}
                    </button>
                  </form>
                </section>

                <section className="card p-6">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search products..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring" />
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring sm:max-w-[220px]">
                      <option value="">All categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {filteredProducts.map((product) => {
                      const productImages = getProductImages(product);
                      return (
                        <article key={product.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                          <img src={productImages[0]} alt={product.name} className="h-44 w-full rounded-xl object-cover" loading="lazy" />
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-heading text-lg font-semibold text-slate-900">{product.name}</h4>
                              <CategoryBadge category={product.category} />
                            </div>
                            {product.description ? (
                              <p className="line-clamp-2 text-xs text-slate-500">{product.description}</p>
                            ) : null}
                            <p className="text-sm font-semibold text-slate-700">NPR {Number(product.price).toFixed(2)}</p>
                            {(product.searchSlugs || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {(product.searchSlugs || []).slice(0, 4).map((slug) => (
                                  <span
                                    key={slug}
                                    className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                  >
                                    {slug}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <SizeChips sizes={product.availableSizes} />
                            <ProductSideChips sides={product.sides || []} />
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(product.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50">
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {filteredProducts.length === 0 ? <p className="text-sm text-slate-500">No products match your filters.</p> : null}
                  </div>
                </section>
              </section>
            ) : null}

            {!isLoading && activeSection === "orders" ? (
              <section className="space-y-6">
                <section className="card p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-heading text-xl font-semibold text-slate-900">Order Management</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Search by order id, customer name, or phone and update statuses in sequence.
                      </p>
                    </div>

                    <form onSubmit={handleApplyOrderSearch} className="flex w-full gap-2 md:max-w-md">
                      <input
                        value={orderSearchInput}
                        onChange={(event) => setOrderSearchInput(event.target.value)}
                        placeholder="Search order id / customer / phone"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-300 focus:ring"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Search
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ORDER_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleSelectOrderRange(option.key)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                          orderRange === option.key
                            ? "bg-teal-600 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="card p-6">
                  {isOrdersLoading ? (
                    <Loader label="Loading orders..." />
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-slate-500">No orders found for this filter.</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const orderAction = getNextOrderAction(order.status);
                        const actionKey = `${order.id}-${orderAction?.nextStatus || ""}`;
                        return (
                          <article
                            key={order.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Order Number</p>
                                <h4 className="font-heading text-lg font-semibold text-slate-900">
                                  {order.orderNumber}
                                </h4>
                                <p className="text-sm text-slate-600">
                                  {order.customerName} | {order.customerPhone}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {order.productSummary || "Product details unavailable"}
                                </p>
                              </div>

                              <div className="flex flex-col items-start gap-2 md:items-end">
                                <OrderStatusBadge status={order.status} />
                                <p className="text-sm font-semibold text-slate-800">
                                  NPR {Number(order.totalAmount || 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500">{formatOrderDate(order.createdAt)}</p>
                                <p className="text-xs text-slate-500">
                                  Qty: {Number(order.totalQuantity || 0)}
                                </p>
                              </div>
                            </div>

                            {orderAction ? (
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOrderStatusUpdate({
                                      orderId: order.id,
                                      status: orderAction.nextStatus
                                    })
                                  }
                                  disabled={activeOrderAction === actionKey}
                                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
                                >
                                  {activeOrderAction === actionKey ? "Updating..." : orderAction.label}
                                </button>
                              </div>
                            ) : (
                              <p className="mt-3 text-right text-xs font-semibold text-emerald-700">
                                Order lifecycle complete
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </section>
            ) : null}

            {!isLoading && activeSection === "settings" ? (
              <section className="space-y-6">
                <section className="card p-6">
                  <h3 className="font-heading text-xl font-semibold text-slate-900">Add New Category</h3>
                  <form className="mt-4 space-y-4" onSubmit={handleCreateCategory}>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Category Name</span>
                      <input value={newCategory.name} onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring" placeholder="Example: Custom Mug" />
                    </label>

                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        id="new-category-supports-sizes"
                        type="checkbox"
                        checked={newCategory.supportsSizes}
                        onChange={(event) => setNewCategory((prev) => ({ ...prev, supportsSizes: event.target.checked, allowedSizes: event.target.checked ? prev.allowedSizes : [] }))}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <label htmlFor="new-category-supports-sizes" className="cursor-pointer">
                        This category has size options
                      </label>
                    </div>

                    {newCategory.supportsSizes ? (
                      <TagEditor
                        title="Size Options"
                        items={newCategory.allowedSizes}
                        inputValue={newCategoryInputs.sizeInput}
                        onInputChange={(value) => setNewCategoryInputs((prev) => ({ ...prev, sizeInput: value }))}
                        onAdd={addNewCategorySize}
                        onRemove={removeNewCategorySize}
                        placeholder="Add size"
                        suggestions={SIZE_SUGGESTIONS}
                      />
                    ) : null}

                    <TagEditor
                      title="Customization Sides"
                      items={newCategory.customizationSides}
                      inputValue={newCategoryInputs.sideInput}
                      onInputChange={(value) => setNewCategoryInputs((prev) => ({ ...prev, sideInput: value }))}
                      onAdd={addNewCategorySide}
                      onRemove={removeNewCategorySide}
                      placeholder="Add side"
                      suggestions={SIDE_SUGGESTIONS}
                      tone="violet"
                    />

                    <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">
                      Add Category
                    </button>
                  </form>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  {categories.map((category) => {
                    const draft = categoryDrafts[category.id] || {
                      name: category.name,
                      supportsSizes: category.supportsSizes,
                      allowedSizes: category.allowedSizes || [],
                      customizationSides: category.customizationSides || ["Front", "Back"]
                    };

                    const draftInputs = categoryInputDrafts[category.id] || {
                      sizeInput: "",
                      sideInput: ""
                    };

                    return (
                      <article key={category.id} className="card p-5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading text-lg font-semibold text-slate-900">Category Settings</h4>
                          <span className="text-xs font-semibold text-slate-500">{category.productCount} products</span>
                        </div>

                        <label className="mt-4 block text-sm">
                          <span className="mb-1 block font-medium text-slate-700">Name</span>
                          <input value={draft.name} onChange={(event) => setCategoryDraft(category.id, (prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring" />
                        </label>

                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                          <input
                            id={`category-${category.id}-supports-sizes`}
                            type="checkbox"
                            checked={draft.supportsSizes}
                            onChange={(event) => setCategoryDraft(category.id, (prev) => ({ ...prev, supportsSizes: event.target.checked, allowedSizes: event.target.checked ? prev.allowedSizes : [] }))}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <label htmlFor={`category-${category.id}-supports-sizes`} className="cursor-pointer">
                            Category has size options
                          </label>
                        </div>

                        {draft.supportsSizes ? (
                          <div className="mt-4">
                            <TagEditor
                              title="Size Options"
                              items={draft.allowedSizes}
                              inputValue={draftInputs.sizeInput}
                              onInputChange={(value) => setCategoryDraftInput(category.id, "sizeInput", value)}
                              onAdd={(value) => addCategoryDraftSize(category.id, value)}
                              onRemove={(value) => removeCategoryDraftSize(category.id, value)}
                              placeholder="Add size option"
                              suggestions={SIZE_SUGGESTIONS}
                            />
                          </div>
                        ) : null}

                        <div className="mt-4">
                          <TagEditor
                            title="Customization Sides"
                            items={draft.customizationSides}
                            inputValue={draftInputs.sideInput}
                            onInputChange={(value) => setCategoryDraftInput(category.id, "sideInput", value)}
                            onAdd={(value) => addCategoryDraftSide(category.id, value)}
                            onRemove={(value) => removeCategoryDraftSide(category.id, value)}
                            placeholder="Add side option"
                            suggestions={SIDE_SUGGESTIONS}
                            tone="violet"
                          />
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button type="button" onClick={() => handleSaveCategory(category.id)} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700">
                            Save
                          </button>
                          <button type="button" onClick={() => handleDeleteCategory(category.id)} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              </section>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
