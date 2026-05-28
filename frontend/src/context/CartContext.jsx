import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addCartItem as addCartItemApi,
  clearCart as clearCartApi,
  deleteCartItem as deleteCartItemApi,
  fetchCartItems as fetchCartItemsApi,
  mergeGuestCart as mergeGuestCartApi,
  updateCartItem as updateCartItemApi
} from "../api/index.js";
import { getWithExpiry, removeKey, setWithExpiry, THIRTY_DAYS_MS } from "../utils/storageExpiry.js";
import {
  assetIdFromUri,
  sanitizeCustomizationStateForStorage
} from "../utils/customizationStorage.js";
import { debugLog, debugWarn } from "../utils/devLogger.js";
import {
  clearCustomizationSession,
  readCustomizationSession
} from "../utils/customizationSession.js";
import { clearDesignAssetsByIds } from "../utils/designAssetStore.js";
import {
  clearDesignPreviewsByRefs,
  sanitizeSidePreviewRefs
} from "../utils/designPreviewStore.js";
import { useUserAuth } from "./UserAuthContext.jsx";

const CartContext = createContext(null);
const GUEST_CART_KEY = "giftcraft-guest-cart";

const normalizeGuestItem = (item) => ({
  ...item,
  selectedSize: String(item?.selectedSize || "").trim().toUpperCase(),
  quantity: Math.min(Math.max(Number(item?.quantity) || 1, 1), 99),
  selectedSides: normalizeSides(item?.selectedSides),
  customizationState: sanitizeCustomizationStateForStorage(item?.customizationState || {}),
  previewImage: String(item?.previewImage || "").trim()
});

const toStoredGuestItem = (item) => ({
  ...normalizeGuestItem(item),
  previewImage: ""
});

const readGuestCart = () => {
  const value = getWithExpiry(GUEST_CART_KEY);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeGuestItem(item));
};

const writeGuestCart = (items) => {
  const ok = setWithExpiry({
    key: GUEST_CART_KEY,
    value: items.map((item) => toStoredGuestItem(item)),
    ttlMs: THIRTY_DAYS_MS
  });
  return ok;
};

const removeGuestCart = () => {
  removeKey(GUEST_CART_KEY);
};

const normalizeSides = (sides) => {
  const source = Array.isArray(sides) ? sides : [];
  return Array.from(new Set(source.map((side) => String(side || "").trim()).filter(Boolean)));
};

const canMergeGuestItem = (a, b) =>
  String(a.productId) === String(b.productId) &&
  String(a.selectedSize || "") === String(b.selectedSize || "") &&
  JSON.stringify(normalizeSides(a.selectedSides)) === JSON.stringify(normalizeSides(b.selectedSides));

const collectAssetIdsFromCanvasStates = (canvasStates) => {
  const snapshots = canvasStates && typeof canvasStates === "object" ? Object.values(canvasStates) : [];
  const assetIds = new Set();

  snapshots.forEach((snapshot) => {
    let parsed = snapshot;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = null;
      }
    }

    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.objects)) {
      return;
    }

    parsed.objects.forEach((object) => {
      if (!object || object.type !== "image") {
        return;
      }
      const assetId =
        assetIdFromUri(object.src) || String(object.giftAssetId || "").trim();
      if (assetId) {
        assetIds.add(assetId);
      }
    });
  });

  return Array.from(assetIds);
};

export const CartProvider = ({ children }) => {
  const { token, isAuthenticated, isInitializing } = useUserAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const cleanupRemovedItemCustomization = async ({
    removedItem,
    remainingItems
  }) => {
    const productId = Number(removedItem?.productId || removedItem?.product?.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      return;
    }

    const removedCustomization = removedItem?.customizationState || {};
    const removedPreviewRefs = sanitizeSidePreviewRefs(removedCustomization.sidePreviewRefs || {});
    const removedAssetIds = collectAssetIdsFromCanvasStates(removedCustomization.canvasStates || {});
    const remainingPreviewRefs = new Set(
      remainingItems.flatMap((item) =>
        Object.values(sanitizeSidePreviewRefs(item?.customizationState?.sidePreviewRefs || {}))
      )
    );
    const remainingAssetIds = new Set(
      remainingItems.flatMap((item) =>
        collectAssetIdsFromCanvasStates(item?.customizationState?.canvasStates || {})
      )
    );
    const previewRefsToDelete = Object.entries(removedPreviewRefs).reduce((acc, [side, ref]) => {
      if (!remainingPreviewRefs.has(ref)) {
        acc[side] = ref;
      }
      return acc;
    }, {});
    const assetIdsToDelete = removedAssetIds.filter((assetId) => !remainingAssetIds.has(assetId));
    await Promise.all([
      clearDesignPreviewsByRefs(previewRefsToDelete),
      clearDesignAssetsByIds(assetIdsToDelete)
    ]);

    const removedItemId = String(removedItem?.id || "");
    const localSession = readCustomizationSession(productId);
    if (
      removedItemId &&
      localSession?.source === "cart-edit" &&
      String(localSession?.cartItemId || "") === removedItemId
    ) {
      clearCustomizationSession(productId, { clearStoredMedia: false });
    }

    const hasRemainingForProduct = remainingItems.some(
      (candidate) => Number(candidate?.productId || candidate?.product?.id) === productId
    );
    if (hasRemainingForProduct) {
      return;
    }

    clearCustomizationSession(productId);
    debugLog("cart", "Cleared product customization after cart item removal", {
      productId: String(productId)
    });
  };

  const loadCart = async () => {
    if (isInitializing) {
      return;
    }

    setIsLoading(true);

    try {
      if (isAuthenticated && token) {
        const memoryGuestItems = items.filter((item) => String(item?.id || "").startsWith("guest-"));
        const guestItems = memoryGuestItems.length > 0 ? memoryGuestItems : readGuestCart();
        if (guestItems.length > 0) {
          debugLog("cart", "Merging guest cart into user cart", {
            count: guestItems.length
          });
          const merged = await mergeGuestCartApi({ token, items: guestItems });
          setItems(merged.items || []);
          removeGuestCart();
        } else {
          const response = await fetchCartItemsApi(token);
          setItems(response.items || []);
        }
      } else {
        setItems(readGuestCart());
      }
    } catch {
      if (!isAuthenticated) {
        setItems(readGuestCart());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, isAuthenticated, token]);

  const addGuestItem = (payload) => {
    const nextItem = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: Number(payload.productId),
      selectedSize: String(payload.selectedSize || "").trim().toUpperCase(),
      quantity: Math.min(Math.max(Number(payload.quantity) || 1, 1), 99),
      selectedSides: normalizeSides(payload.selectedSides),
      customizationState: payload.customizationState || {},
      previewImage: String(payload.previewImage || "").trim(),
      unitPrice: Number(payload.unitPrice || 0),
      product: payload.product || {}
    };

    const current =
      items.length > 0 && items.every((item) => String(item?.id || "").startsWith("guest-"))
        ? [...items]
        : readGuestCart();
    const index = current.findIndex((item) => canMergeGuestItem(item, nextItem));

    let nextItems;
    let addedItem;
    if (index >= 0) {
      nextItems = [...current];
      nextItems[index] = {
        ...nextItems[index],
        quantity: Math.min(Number(nextItems[index].quantity || 1) + nextItem.quantity, 99),
        customizationState: nextItem.customizationState,
        previewImage: nextItem.previewImage || nextItems[index].previewImage
      };
      addedItem = nextItems[index];
    } else {
      nextItems = [nextItem, ...current];
      addedItem = nextItem;
    }

    const persisted = writeGuestCart(nextItems);
    if (!persisted) {
      debugWarn("cart", "Guest cart write failed due storage limits", {
        count: nextItems.length
      });
    }

    debugLog("cart", "Guest cart updated", {
      count: nextItems.length,
      persisted
    });
    setItems(nextItems);
    return {
      ...addedItem,
      __storagePersisted: persisted
    };
  };

  const addToCart = async (payload) => {
    if (isAuthenticated && token) {
      const response = await addCartItemApi({ token, payload });
      const nextItem = response.item;
      setItems((prev) => [nextItem, ...prev.filter((item) => String(item.id) !== String(nextItem.id))]);
      return nextItem;
    }

    return addGuestItem(payload);
  };

  const updateCartItem = async ({ itemId, payload }) => {
    if (isAuthenticated && token) {
      const response = await updateCartItemApi({ token, itemId, payload });
      setItems(response.items || []);
      return response.items || [];
    }

    const current =
      items.length > 0 && items.every((item) => String(item?.id || "").startsWith("guest-"))
        ? items
        : readGuestCart();
    const next = current.map((item) => {
      if (String(item.id) !== String(itemId)) {
        return item;
      }
      return {
        ...item,
        ...payload,
        quantity: payload.quantity ? Math.min(Math.max(Number(payload.quantity), 1), 99) : item.quantity
      };
    });
    const persisted = writeGuestCart(next);
    if (!persisted) {
      debugWarn("cart", "Guest cart update could not be persisted", {
        itemId: String(itemId)
      });
    }
    setItems(next);
    return next;
  };

  const removeFromCart = async (itemId) => {
    if (isAuthenticated && token) {
      const currentItems = items.length > 0 ? [...items] : [];
      const removedItem = currentItems.find((item) => String(item.id) === String(itemId));
      const response = await deleteCartItemApi({ token, itemId });
      const nextItems = response.items || [];
      setItems(nextItems);
      if (removedItem) {
        await cleanupRemovedItemCustomization({
          removedItem,
          remainingItems: nextItems
        });
      }
      return;
    }

    const source =
      items.length > 0 && items.every((item) => String(item?.id || "").startsWith("guest-"))
        ? items
        : readGuestCart();
    const removedItem = source.find((item) => String(item.id) === String(itemId));
    const next = source.filter((item) => String(item.id) !== String(itemId));
    const persisted = writeGuestCart(next);
    if (!persisted && next.length === 0) {
      removeGuestCart();
    } else if (!persisted) {
      debugWarn("cart", "Guest cart remove could not be persisted", {
        itemId: String(itemId),
        remainingCount: next.length
      });
    }
    setItems(next);
    if (removedItem) {
      await cleanupRemovedItemCustomization({
        removedItem,
        remainingItems: next
      });
    }
  };

  const clearCart = async () => {
    const productIds = Array.from(
      new Set(
        (items || [])
          .map((item) => Number(item?.productId || item?.product?.id))
          .filter((productId) => Number.isFinite(productId) && productId > 0)
      )
    );

    if (isAuthenticated && token) {
      await clearCartApi(token);
      productIds.forEach((productId) => clearCustomizationSession(productId));
      setItems([]);
      return;
    }

    productIds.forEach((productId) => clearCustomizationSession(productId));
    removeGuestCart();
    setItems([]);
  };

  const value = useMemo(
    () => ({
      items,
      isLoading,
      itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
      subtotal: items.reduce(
        (sum, item) => sum + Number(item.unitPrice || item.product?.price || 0) * Number(item.quantity || 1),
        0
      ),
      reload: loadCart,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      readGuestCart
    }),
    [items, isLoading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
};
