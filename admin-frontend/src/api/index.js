import { apiClient } from "./client.js";

export const fetchProducts = async ({ search = "", category = "" } = {}) => {
  const { data } = await apiClient.get("/products", {
    params: {
      search: search || undefined,
      category: category || undefined
    }
  });
  return data;
};

export const adminLogin = async (payload) => {
  const { data } = await apiClient.post("/admin/login", payload);
  return data;
};

export const createProduct = async ({ token, formData }) => {
  const { data } = await apiClient.post("/products", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
};

export const updateProduct = async ({ token, productId, formData }) => {
  const { data } = await apiClient.put(`/products/${productId}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
};

export const deleteProduct = async ({ token, productId }) => {
  const { data } = await apiClient.delete(`/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const fetchCategories = async () => {
  const { data } = await apiClient.get("/categories");
  return data;
};

export const createCategory = async ({ token, payload }) => {
  const { data } = await apiClient.post("/categories", payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const updateCategory = async ({ token, categoryId, payload }) => {
  const { data } = await apiClient.put(`/categories/${categoryId}`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const deleteCategory = async ({ token, categoryId }) => {
  const { data } = await apiClient.delete(`/categories/${categoryId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};
