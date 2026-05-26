import { Router } from "express";
import {
  createOrder,
  createUserOrder,
  getAdminOrderStats,
  getAdminOrders,
  getMyOrders,
  updateOrderStatus
} from "../controllers/orderController.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { requireUser } from "../middleware/userAuth.js";

const orderRoutes = Router();

orderRoutes.post("/order", createOrder);
orderRoutes.post("/orders", requireUser, createUserOrder);
orderRoutes.get("/orders/my", requireUser, getMyOrders);
orderRoutes.get("/admin/orders", requireAdmin, getAdminOrders);
orderRoutes.get("/admin/orders/stats", requireAdmin, getAdminOrderStats);
orderRoutes.patch("/admin/orders/:id/status", requireAdmin, updateOrderStatus);

export default orderRoutes;
