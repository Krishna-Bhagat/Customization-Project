import dotenv from "dotenv";

dotenv.config();

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  frontendUrls: (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || "",
  dbSsl: toBoolean(process.env.DB_SSL, false),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  },
  admin: {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123"
  },
  jwtSecret: process.env.JWT_SECRET || "dev_secret_only",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: toBoolean(process.env.SMTP_SECURE, false)
  },
  adminEmail: process.env.ADMIN_EMAIL || "",
  fromEmail: process.env.FROM_EMAIL || process.env.SMTP_USER || "no-reply@example.com"
};

export const assertRequiredEnv = () => {
  const required = [
    ["DATABASE_URL", env.databaseUrl],
    ["CLOUDINARY_CLOUD_NAME", env.cloudinary.cloudName],
    ["CLOUDINARY_API_KEY", env.cloudinary.apiKey],
    ["CLOUDINARY_API_SECRET", env.cloudinary.apiSecret],
    ["JWT_SECRET", env.jwtSecret],
    ["SMTP_HOST", env.smtp.host],
    ["SMTP_USER", env.smtp.user],
    ["SMTP_PASS", env.smtp.pass],
    ["ADMIN_EMAIL", env.adminEmail]
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};
