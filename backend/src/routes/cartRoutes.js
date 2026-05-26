import { Router } from "express";
import {
  addCartItem,
  clearCart,
  deleteCartItem,
  getCartItems,
  mergeGuestCart,
  updateCartItem
} from "../controllers/cartController.js";
import { requireUser } from "../middleware/userAuth.js";

const cartRoutes = Router();

cartRoutes.get("/cart/items", requireUser, getCartItems);
cartRoutes.post("/cart/items", requireUser, addCartItem);
cartRoutes.put("/cart/items/:id", requireUser, updateCartItem);
cartRoutes.delete("/cart/items/:id", requireUser, deleteCartItem);
cartRoutes.delete("/cart/items", requireUser, clearCart);
cartRoutes.post("/cart/merge", requireUser, mergeGuestCart);

export default cartRoutes;
