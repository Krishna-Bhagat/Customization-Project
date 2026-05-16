import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const loginAdmin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  if (username !== env.admin.username || password !== env.admin.password) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = jwt.sign({ role: "admin", username }, env.jwtSecret, {
    expiresIn: "12h"
  });

  return res.status(200).json({ token });
};
