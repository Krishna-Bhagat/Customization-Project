import { pool } from "../db/pool.js";
import {
  DEFAULT_SIDE_OPTIONS,
  SIZE_OPTIONS,
  getPrintableAreaPreset,
  normalizeSizeList,
  normalizeSideList,
  toSideKey,
  toSlug
} from "../constants/productMeta.js";
import { parseSizesInput } from "../utils/sizeParser.js";
import { parseSidesInput } from "../utils/sideParser.js";

const validateCategoryName = (name) => {
  const value = String(name || "").trim();
  if (!value) {
    return "";
  }
  return value.slice(0, 120);
};

const parseBooleanInput = (value, fallback = true) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const normalizeAllowedSizes = (input) => {
  const parsed = parseSizesInput(input);
  return normalizeSizeList(parsed);
};

const normalizeCustomizationSides = (input) => {
  const parsed = parseSidesInput(input);
  const sides = normalizeSideList(parsed);
  return sides.length > 0 ? sides : [...DEFAULT_SIDE_OPTIONS];
};

const formatCategoryRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  supportsSizes: row.supportsSizes,
  allowedSizes: row.allowedSizes || [],
  customizationSides: row.customizationSides || [],
  productCount: row.productCount ?? 0
});

export const getCategories = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.supports_sizes AS "supportsSizes",
        c.allowed_sizes AS "allowedSizes",
        c.customization_sides AS "customizationSides",
        COALESCE(COUNT(p.id), 0)::INT AS "productCount"
      FROM categories c
      LEFT JOIN products p ON LOWER(p.category) = LOWER(c.name)
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return res.status(200).json(rows.map(formatCategoryRow));
  } catch (error) {
    return next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const name = validateCategoryName(req.body.name);
    const slug = toSlug(name);
    const supportsSizes = parseBooleanInput(req.body.supportsSizes, true);
    const allowedSizes = supportsSizes ? normalizeAllowedSizes(req.body.allowedSizes) : [];
    const customizationSides = normalizeCustomizationSides(req.body.customizationSides);

    if (!name) {
      return res.status(400).json({ message: "Category name is required." });
    }

    if (!slug) {
      return res.status(400).json({ message: "Category slug is invalid." });
    }

    if (supportsSizes && allowedSizes.length === 0) {
      return res.status(400).json({ message: "Select at least one allowed size for category." });
    }

    if (customizationSides.length === 0) {
      return res.status(400).json({ message: "Select at least one customization side for category." });
    }

    const { rows } = await pool.query(
      `
        INSERT INTO categories (name, slug, supports_sizes, allowed_sizes, customization_sides)
        VALUES ($1, $2, $3, $4::TEXT[], $5::TEXT[])
        RETURNING
          id,
          name,
          slug,
          supports_sizes AS "supportsSizes",
          allowed_sizes AS "allowedSizes",
          customization_sides AS "customizationSides",
          0::INT AS "productCount"
      `,
      [name, slug, supportsSizes, allowedSizes, customizationSides]
    );

    return res.status(201).json(formatCategoryRow(rows[0]));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Category with this name already exists." });
    }
    return next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const categoryId = Number(req.params.id);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category id." });
    }

    const name = validateCategoryName(req.body.name);
    const slug = toSlug(name);
    const supportsSizes = parseBooleanInput(req.body.supportsSizes, true);
    const allowedSizes = supportsSizes ? normalizeAllowedSizes(req.body.allowedSizes) : [];
    const customizationSides = normalizeCustomizationSides(req.body.customizationSides);

    if (!name || !slug) {
      return res.status(400).json({ message: "Valid category name is required." });
    }

    if (supportsSizes && allowedSizes.length === 0) {
      return res.status(400).json({ message: "Select at least one allowed size for category." });
    }

    if (customizationSides.length === 0) {
      return res.status(400).json({ message: "Select at least one customization side for category." });
    }

    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      "SELECT id, name FROM categories WHERE id = $1 LIMIT 1",
      [categoryId]
    );

    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Category not found." });
    }

    const previousName = existingRows[0].name;

    const { rows: updatedRows } = await client.query(
      `
        UPDATE categories
        SET
          name = $1,
          slug = $2,
          supports_sizes = $3,
          allowed_sizes = $4::TEXT[],
          customization_sides = $5::TEXT[],
          updated_at = NOW()
        WHERE id = $6
        RETURNING
          id,
          name,
          slug,
          supports_sizes AS "supportsSizes",
          allowed_sizes AS "allowedSizes",
          customization_sides AS "customizationSides"
      `,
      [name, slug, supportsSizes, allowedSizes, customizationSides, categoryId]
    );

    if (previousName.toLowerCase() !== name.toLowerCase()) {
      await client.query("UPDATE products SET category = $1 WHERE LOWER(category) = LOWER($2)", [
        name,
        previousName
      ]);
    }

    if (!supportsSizes) {
      await client.query("UPDATE products SET available_sizes = ARRAY[]::TEXT[] WHERE LOWER(category) = LOWER($1)", [
        name
      ]);
    } else {
      await client.query(
        `
          UPDATE products
          SET available_sizes = (
            SELECT COALESCE(
              ARRAY(
                SELECT value
                FROM UNNEST(available_sizes) AS value
                WHERE value = ANY($1::TEXT[])
              ),
              ARRAY[]::TEXT[]
            )
          )
          WHERE LOWER(category) = LOWER($2)
        `,
        [allowedSizes, name]
      );

      await client.query(
        `
          UPDATE products
          SET available_sizes = $1::TEXT[]
          WHERE LOWER(category) = LOWER($2)
            AND (available_sizes IS NULL OR array_length(available_sizes, 1) IS NULL)
        `,
        [allowedSizes, name]
      );
    }

    const allowedSideKeys = customizationSides.map((side) => toSideKey(side));

    await client.query(
      `
        DELETE FROM product_sides ps
        USING products p
        WHERE ps.product_id = p.id
          AND LOWER(p.category) = LOWER($1)
          AND NOT (ps.side_key = ANY($2::TEXT[]))
      `,
      [name, allowedSideKeys]
    );

    for (const sideName of customizationSides) {
      const sideKey = toSideKey(sideName);
      const defaultArea = getPrintableAreaPreset({ category: name, side: sideName });

      await client.query(
        `
          INSERT INTO product_sides (
            product_id,
            side_name,
            side_key,
            mockup_image,
            printable_area_x,
            printable_area_y,
            printable_area_width,
            printable_area_height
          )
          SELECT
            p.id,
            $2,
            $3,
            p.gallery_images[1],
            $4,
            $5,
            $6,
            $7
          FROM products p
          WHERE LOWER(p.category) = LOWER($1)
            AND p.gallery_images IS NOT NULL
            AND array_length(p.gallery_images, 1) IS NOT NULL
          ON CONFLICT (product_id, side_key) DO NOTHING
        `,
        [
          name,
          sideName,
          sideKey,
          defaultArea.x,
          defaultArea.y,
          defaultArea.width,
          defaultArea.height
        ]
      );
    }

    await client.query("COMMIT");

    const { rows: withCountRows } = await pool.query(
      `
        SELECT
          c.id,
          c.name,
          c.slug,
          c.supports_sizes AS "supportsSizes",
          c.allowed_sizes AS "allowedSizes",
          c.customization_sides AS "customizationSides",
          COALESCE(COUNT(p.id), 0)::INT AS "productCount"
        FROM categories c
        LEFT JOIN products p ON LOWER(p.category) = LOWER(c.name)
        WHERE c.id = $1
        GROUP BY c.id
      `,
      [categoryId]
    );

    return res.status(200).json(formatCategoryRow(withCountRows[0] || updatedRows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ message: "Category with this name already exists." });
    }
    return next(error);
  } finally {
    client.release();
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category id." });
    }

    const { rows: existingRows } = await pool.query(
      "SELECT id, name FROM categories WHERE id = $1 LIMIT 1",
      [categoryId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Category not found." });
    }

    const categoryName = existingRows[0].name;

    const { rows: usageRows } = await pool.query(
      "SELECT COUNT(*)::INT AS count FROM products WHERE LOWER(category) = LOWER($1)",
      [categoryName]
    );

    if (usageRows[0].count > 0) {
      return res.status(400).json({
        message: "Cannot delete category while products are still assigned to it."
      });
    }

    await pool.query("DELETE FROM categories WHERE id = $1", [categoryId]);
    return res.status(200).json({ message: "Category deleted." });
  } catch (error) {
    return next(error);
  }
};

export const getSizeOptions = (req, res) => {
  return res.status(200).json({ sizes: normalizeSizeList(SIZE_OPTIONS) });
};
