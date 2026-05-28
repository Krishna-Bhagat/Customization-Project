import { apiClient } from "./client.js";

const withAuth = (token = "") => ({
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const fetchProducts = async ({ search = "", category = "", size = "" } = {}) => {
  const { data } = await apiClient.get("/products", {
    params: {
      search: search || undefined,
      category: category || undefined,
      size: size || undefined
    }
  });
  return data;
};

export const fetchCategories = async () => {
  const { data } = await apiClient.get("/categories");
  return data;
};

export const uploadDesign = async ({
  designs = {},
  front,
  back,
  leftSleeve,
  rightSleeve,
  frontDesign,
  backDesign,
  leftSleeveDesign,
  rightSleeveDesign
} = {}) => {
  const normalizedDesigns = {
    ...designs
  };

  const legacy = {
    front: front || frontDesign || "",
    back: back || backDesign || "",
    leftSleeve: leftSleeve || leftSleeveDesign || "",
    rightSleeve: rightSleeve || rightSleeveDesign || ""
  };

  Object.entries(legacy).forEach(([key, value]) => {
    if (value) {
      normalizedDesigns[key] = value;
    }
  });

  const { data } = await apiClient.post("/upload-design", {
    designs: normalizedDesigns
  });
  return data;
};

export const createOrder = async (payload) => {
  const { data } = await apiClient.post("/order", payload);
  return data;
};

export const registerUser = async (payload) => {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
};

export const forgotPassword = async (payload) => {
  const { data } = await apiClient.post("/auth/forgot-password", payload);
  return data;
};

export const fetchCurrentUser = async (token) => {
  const { data } = await apiClient.get("/auth/me", withAuth(token));
  return data;
};

export const updateProfile = async ({ token, payload }) => {
  const { data } = await apiClient.put("/auth/profile", payload, withAuth(token));
  return data;
};

export const updateProfilePassword = async ({ token, payload }) => {
  const { data } = await apiClient.put("/auth/password", payload, withAuth(token));
  return data;
};

export const fetchCartItems = async (token) => {
  const { data } = await apiClient.get("/cart/items", withAuth(token));
  return data;
};

export const addCartItem = async ({ token, payload }) => {
  const { data } = await apiClient.post("/cart/items", payload, withAuth(token));
  return data;
};

export const updateCartItem = async ({ token, itemId, payload }) => {
  const { data } = await apiClient.put(`/cart/items/${itemId}`, payload, withAuth(token));
  return data;
};

export const deleteCartItem = async ({ token, itemId }) => {
  const { data } = await apiClient.delete(`/cart/items/${itemId}`, withAuth(token));
  return data;
};

export const clearCart = async (token) => {
  const { data } = await apiClient.delete("/cart/items", withAuth(token));
  return data;
};

export const mergeGuestCart = async ({ token, items }) => {
  const { data } = await apiClient.post("/cart/merge", { items }, withAuth(token));
  return data;
};

export const createUserOrder = async ({ token, payload }) => {
  const { data } = await apiClient.post("/orders", payload, withAuth(token));
  return data;
};

export const fetchMyOrders = async (token) => {
  const { data } = await apiClient.get("/orders/my", withAuth(token));
  return data;
};
