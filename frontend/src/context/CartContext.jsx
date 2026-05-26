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
import { useUserAuth } from "./UserAuthContext.jsx";

const CartContext = createContext(null);
const GUEST_CART_KEY = "giftcraft-guest-cart";

const readGuestCart = () => {
  const value = getWithExpiry(GUEST_CART_KEY);
  return Array.isArray(value) ? value : [];
};

const writeGuestCart = (items) => {
  setWithExpiry({
    key: GUEST_CART_KEY,
    value: items,
    ttlMs: THIRTY_DAYS_MS
  });
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

export const CartProvider = ({ children }) => {
  const { token, isAuthenticated, isInitializing } = useUserAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCart = async () => {
    if (isInitializing) {
      return;
    }

    setIsLoading(true);

    try {
      if (isAuthenticated && token) {
        const guestItems = readGuestCart();
        if (guestItems.length > 0) {
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

    const current = readGuestCart();
    const index = current.findIndex((item) => canMergeGuestItem(item, nextItem));

    let nextItems;
    if (index >= 0) {
      nextItems = [...current];
      nextItems[index] = {
        ...nextItems[index],
        quantity: Math.min(Number(nextItems[index].quantity || 1) + nextItem.quantity, 99),
        customizationState: nextItem.customizationState,
        previewImage: nextItem.previewImage || nextItems[index].previewImage
      };
    } else {
      nextItems = [nextItem, ...current];
    }

    writeGuestCart(nextItems);
    setItems(nextItems);
    return nextItem;
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

    const current = readGuestCart();
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
    writeGuestCart(next);
    setItems(next);
    return next;
  };

  const removeFromCart = async (itemId) => {
    if (isAuthenticated && token) {
      const response = await deleteCartItemApi({ token, itemId });
      setItems(response.items || []);
      return;
    }

    const next = readGuestCart().filter((item) => String(item.id) !== String(itemId));
    writeGuestCart(next);
    setItems(next);
  };

  const clearCart = async () => {
    if (isAuthenticated && token) {
      await clearCartApi(token);
      setItems([]);
      return;
    }
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
