import cors from "cors";
import express from "express";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import designRoutes from "./routes/designRoutes.js";
import draftRoutes from "./routes/draftRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

const app = express();

app.use(requestLogger);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.frontendUrls.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(adminRoutes);
app.use(authRoutes);
app.use(categoryRoutes);
app.use(productRoutes);
app.use(designRoutes);
app.use(cartRoutes);
app.use(draftRoutes);
app.use(orderRoutes);

app.use(errorHandler);

export default app;
