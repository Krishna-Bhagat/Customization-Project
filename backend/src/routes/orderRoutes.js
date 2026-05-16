import { Router } from "express";
import { createOrder } from "../controllers/orderController.js";

const orderRoutes = Router();

orderRoutes.post("/order", createOrder);

export default orderRoutes;
