import { Router } from "express";
import {
  deleteUserDraftByProduct,
  getUserDraftByProduct,
  getUserDrafts,
  upsertUserDraft
} from "../controllers/draftController.js";
import { requireUser } from "../middleware/userAuth.js";

const draftRoutes = Router();

draftRoutes.get("/drafts", requireUser, getUserDrafts);
draftRoutes.get("/drafts/:productId", requireUser, getUserDraftByProduct);
draftRoutes.put("/drafts/:productId", requireUser, upsertUserDraft);
draftRoutes.delete("/drafts/:productId", requireUser, deleteUserDraftByProduct);

export default draftRoutes;
