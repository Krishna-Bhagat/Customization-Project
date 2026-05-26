import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const USER_TOKEN_EXPIRES_IN = "14d";

export const hashPassword = async (password) => bcrypt.hash(password, 12);

export const comparePassword = async (plain, hashed) => bcrypt.compare(plain, hashed);

export const signUserToken = ({ userId, phone }) =>
  jwt.sign(
    {
      role: "user",
      userId,
      phone
    },
    env.jwtSecret,
    { expiresIn: USER_TOKEN_EXPIRES_IN }
  );

export const validatePhoneNumber = (phone) => /^\d{10}$/.test(String(phone || "").trim());

export const normalizePhoneNumber = (phone) => String(phone || "").trim();

export const normalizeOptionalEmail = (email) => {
  const token = String(email || "").trim().toLowerCase();
  return token || "";
};

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
