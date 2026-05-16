import { Router } from "express";
import multer from "multer";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct
} from "../controllers/productController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const productRoutes = Router();

productRoutes.get("/products", getProducts);
productRoutes.post(
  "/products",
  requireAdmin,
  upload.any(),
  createProduct
);
productRoutes.put("/products/:id", requireAdmin, upload.any(), updateProduct);
productRoutes.delete("/products/:id", requireAdmin, deleteProduct);

export default productRoutes;
