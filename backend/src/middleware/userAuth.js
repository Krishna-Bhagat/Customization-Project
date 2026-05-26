import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const requireUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload?.role !== "user" || !payload?.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = {
      id: Number(payload.userId),
      phone: payload.phone || ""
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
