import { Router } from "express";
import {
  forgotPassword,
  getCurrentUser,
  loginUser,
  registerUser,
  updateUserPassword,
  updateUserProfile
} from "../controllers/authController.js";
import { requireUser } from "../middleware/userAuth.js";

const authRoutes = Router();

authRoutes.post("/auth/register", registerUser);
authRoutes.post("/auth/login", loginUser);
authRoutes.post("/auth/forgot-password", forgotPassword);

authRoutes.get("/auth/me", requireUser, getCurrentUser);
authRoutes.put("/auth/profile", requireUser, updateUserProfile);
authRoutes.put("/auth/password", requireUser, updateUserPassword);

export default authRoutes;
