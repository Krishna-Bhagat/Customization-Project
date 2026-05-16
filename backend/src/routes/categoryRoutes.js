import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getSizeOptions,
  updateCategory
} from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const categoryRoutes = Router();

categoryRoutes.get("/categories", getCategories);
categoryRoutes.get("/sizes", getSizeOptions);
categoryRoutes.post("/categories", requireAdmin, createCategory);
categoryRoutes.put("/categories/:id", requireAdmin, updateCategory);
categoryRoutes.delete("/categories/:id", requireAdmin, deleteCategory);

export default categoryRoutes;
