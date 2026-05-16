import { Router } from "express";
import { uploadDesign } from "../controllers/designController.js";

const designRoutes = Router();

designRoutes.post("/upload-design", uploadDesign);

export default designRoutes;
