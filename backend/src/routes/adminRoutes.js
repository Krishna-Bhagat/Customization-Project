import { Router } from "express";
import { loginAdmin } from "../controllers/adminController.js";

const adminRoutes = Router();

adminRoutes.post("/admin/login", loginAdmin);

export default adminRoutes;
