import { apiClient } from "./client.js";

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
