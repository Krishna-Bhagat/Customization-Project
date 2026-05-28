import { pool } from "../db/pool.js";
import { toSideKey } from "../constants/productMeta.js";

const normalizeSides = (sides) => {
  if (!Array.isArray(sides)) {
    return [];
  }

  const unique = new Set();
  sides.forEach((side) => {
    const key = toSideKey(side);
    if (key) {
      unique.add(key);
    }
  });

  return Array.from(unique.values());
};

const normalizeJsonObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const normalizeSidePreviewRefs = (value) => {
  const refs = normalizeJsonObject(value);

  return Object.entries(refs).reduce((acc, [side, ref]) => {
    const sideKey = toSideKey(side);
    const previewRef = String(ref || "").trim();
    if (!sideKey || !previewRef) {
      return acc;
    }
    acc[sideKey] = previewRef;
    return acc;
  }, {});
};

const normalizeDraftMode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "manual" ? "manual" : "auto";
};

const mapDraftRow = (row) => ({
  id: Number(row.id),
  productId: Number(row.product_id),
  selectedSize: row.selected_size || "",
  quantity: Number(row.quantity || 1),
  selectedSides: Array.isArray(row.selected_sides) ? row.selected_sides : [],
  activeSide: row.active_side || "",
  canvasStates: normalizeJsonObject(row.canvas_states),
  designExports: normalizeJsonObject(row.design_exports),
  sidePreviewRefs: normalizeSidePreviewRefs(row.side_preview_refs),
  previewImage: row.preview_image || "",
  draftMode: normalizeDraftMode(row.draft_mode),
  isManualSave: normalizeDraftMode(row.draft_mode) === "manual",
  savedAt: row.saved_at ? new Date(row.saved_at).getTime() : Date.now(),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getUserDrafts = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT *
        FROM drafts
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      drafts: rows.map(mapDraftRow)
    });
  } catch (error) {
    return next(error);
  }
};

export const getUserDraftByProduct = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const { rows } = await pool.query(
      `
        SELECT *
        FROM drafts
        WHERE user_id = $1
          AND product_id = $2
        LIMIT 1
      `,
      [req.user.id, productId]
    );

    return res.status(200).json({
      draft: rows[0] ? mapDraftRow(rows[0]) : null
    });
  } catch (error) {
    return next(error);
  }
};

export const upsertUserDraft = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const selectedSize = String(req.body.selectedSize || "").trim().toUpperCase();
    const quantity = Math.min(Math.max(Number(req.body.quantity) || 1, 1), 99);
    const selectedSides = normalizeSides(req.body.selectedSides);
    const activeSide = toSideKey(req.body.activeSide || selectedSides[0] || "");
    const canvasStates = normalizeJsonObject(req.body.canvasStates);
    const designExports = normalizeJsonObject(req.body.designExports);
    const sidePreviewRefs = normalizeSidePreviewRefs(req.body.sidePreviewRefs);
    const previewImage = String(req.body.previewImage || "").trim();
    const draftMode = normalizeDraftMode(
      req.body.draftMode || (req.body.isManualSave ? "manual" : "auto")
    );
    const savedAt = Number(req.body.savedAt) > 0 ? new Date(Number(req.body.savedAt)) : new Date();

    const result = await pool.query(
      `
        INSERT INTO drafts (
          user_id,
          product_id,
          selected_size,
          quantity,
          selected_sides,
          active_side,
          canvas_states,
          design_exports,
          side_preview_refs,
          preview_image,
          draft_mode,
          saved_at
        )
        VALUES ($1, $2, $3, $4, $5::TEXT[], $6, $7::JSONB, $8::JSONB, $9::JSONB, $10, $11, $12)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET
          selected_size = EXCLUDED.selected_size,
          quantity = EXCLUDED.quantity,
          selected_sides = EXCLUDED.selected_sides,
          active_side = EXCLUDED.active_side,
          canvas_states = EXCLUDED.canvas_states,
          design_exports = EXCLUDED.design_exports,
          side_preview_refs = EXCLUDED.side_preview_refs,
          preview_image = EXCLUDED.preview_image,
          draft_mode = EXCLUDED.draft_mode,
          saved_at = EXCLUDED.saved_at,
          updated_at = NOW()
        RETURNING *
      `,
      [
        req.user.id,
        productId,
        selectedSize || null,
        quantity,
        selectedSides,
        activeSide || null,
        JSON.stringify(canvasStates),
        JSON.stringify(designExports),
        JSON.stringify(sidePreviewRefs),
        previewImage || null,
        draftMode,
        savedAt
      ]
    );

    return res.status(200).json({
      message: "Draft saved successfully.",
      draft: mapDraftRow(result.rows[0])
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteUserDraftByProduct = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const autoOnly = ["1", "true", "yes"].includes(String(req.query.autoOnly || "").trim().toLowerCase());

    if (autoOnly) {
      const deleteResult = await pool.query(
        "DELETE FROM drafts WHERE user_id = $1 AND product_id = $2 AND draft_mode = 'auto' RETURNING id",
        [req.user.id, productId]
      );
      const manualResult = await pool.query(
        "SELECT id FROM drafts WHERE user_id = $1 AND product_id = $2 AND draft_mode = 'manual' LIMIT 1",
        [req.user.id, productId]
      );
      return res.status(200).json({
        message:
          deleteResult.rows.length > 0
            ? "Auto draft removed successfully."
            : "No auto draft found to remove.",
        deleted: deleteResult.rows.length > 0,
        preservedManual: Boolean(manualResult.rows[0])
      });
    }

    await pool.query("DELETE FROM drafts WHERE user_id = $1 AND product_id = $2", [
      req.user.id,
      productId
    ]);
    return res.status(200).json({
      message: "Draft removed successfully."
    });
  } catch (error) {
    return next(error);
  }
};
