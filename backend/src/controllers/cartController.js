import { pool } from "../db/pool.js";
import { toSideKey } from "../constants/productMeta.js";

const MAX_CART_ITEMS_PER_USER = 100;

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeSides = (sides) => {
  const source = Array.isArray(sides) ? sides : [];
  const unique = new Set();

  source.forEach((side) => {
    const key = toSideKey(side);
    if (key) {
      unique.add(key);
    }
  });

  return Array.from(unique.values());
};

const normalizeCustomizationState = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const normalizeProductSnapshot = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const mapCartRow = (row) => {
  const snapshot = normalizeProductSnapshot(row.product_snapshot);
  const currentGallery = Array.isArray(row.current_gallery_images) ? row.current_gallery_images : [];
  const snapshotGallery = Array.isArray(snapshot.galleryImages) ? snapshot.galleryImages : [];
  const snapshotImageUrl = String(snapshot.imageUrl || snapshotGallery[0] || "");
  const currentImageUrl = String(currentGallery[0] || "");

  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    selectedSize: row.selected_size || "",
    quantity: Number(row.quantity),
    selectedSides: Array.isArray(row.selected_sides) ? row.selected_sides : [],
    customizationState: normalizeCustomizationState(row.customization_state),
    previewImage: row.preview_image || "",
    unitPrice: Number(row.unit_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product: {
      id: Number(row.product_id),
      name: snapshot.name || row.current_product_name || "",
      category: snapshot.category || row.current_category || "",
      description: snapshot.description || row.current_description || "",
      price: toNumber(snapshot.price, toNumber(row.current_price, toNumber(row.unit_price))),
      imageUrl: snapshotImageUrl || currentImageUrl || "",
      galleryImages: snapshotGallery.length > 0 ? snapshotGallery : currentGallery
    }
  };
};

const fetchCartItemsByUser = async (userId, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT
        ci.*,
        p.name AS current_product_name,
        p.category AS current_category,
        p.description AS current_description,
        p.price AS current_price,
        p.gallery_images AS current_gallery_images
      FROM cart_items ci
      LEFT JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = $1
      ORDER BY ci.updated_at DESC
    `,
    [userId]
  );

  return rows.map(mapCartRow);
};

const fetchProductForCart = async (productId, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT
        id,
        name,
        category,
        description,
        price,
        gallery_images
      FROM products
      WHERE id = $1
      LIMIT 1
    `,
    [productId]
  );

  return rows[0] || null;
};

const createCartItem = async ({ userId, payload, client = pool }) => {
  const productId = Number(payload.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    throw Object.assign(new Error("Valid productId is required."), { status: 400 });
  }

  const product = await fetchProductForCart(productId, client);
  if (!product) {
    throw Object.assign(new Error("Product not found."), { status: 404 });
  }

  const selectedSides = normalizeSides(payload.selectedSides);
  const quantity = Math.min(Math.max(Number(payload.quantity) || 1, 1), 99);
  const selectedSize = String(payload.selectedSize || "").trim().toUpperCase();
  const customizationState = normalizeCustomizationState(payload.customizationState);
  const previewImage = String(payload.previewImage || "").trim();
  const productSnapshot = {
    ...normalizeProductSnapshot(payload.productSnapshot),
    id: Number(product.id),
    name: String(product.name || ""),
    category: String(product.category || ""),
    description: String(product.description || ""),
    price: toNumber(product.price),
    imageUrl: String((Array.isArray(product.gallery_images) ? product.gallery_images[0] : "") || ""),
    galleryImages: Array.isArray(product.gallery_images) ? product.gallery_images : []
  };
  const unitPrice = toNumber(payload.unitPrice, toNumber(product.price));

  const countResult = await client.query("SELECT COUNT(*)::INT AS count FROM cart_items WHERE user_id = $1", [
    userId
  ]);
  if (Number(countResult.rows[0].count || 0) >= MAX_CART_ITEMS_PER_USER) {
    throw Object.assign(new Error("Cart item limit reached."), { status: 400 });
  }

  const insertResult = await client.query(
    `
      INSERT INTO cart_items (
        user_id,
        product_id,
        selected_size,
        quantity,
        selected_sides,
        customization_state,
        preview_image,
        product_snapshot,
        unit_price
      )
      VALUES ($1, $2, $3, $4, $5::TEXT[], $6::JSONB, $7, $8::JSONB, $9)
      RETURNING id
    `,
    [
      userId,
      productId,
      selectedSize || null,
      quantity,
      selectedSides,
      JSON.stringify(customizationState),
      previewImage || null,
      JSON.stringify(productSnapshot),
      unitPrice
    ]
  );

  const itemId = Number(insertResult.rows[0].id);
  const { rows } = await client.query(
    `
      SELECT
        ci.*,
        p.name AS current_product_name,
        p.category AS current_category,
        p.description AS current_description,
        p.price AS current_price,
        p.gallery_images AS current_gallery_images
      FROM cart_items ci
      LEFT JOIN products p ON p.id = ci.product_id
      WHERE ci.id = $1
      LIMIT 1
    `,
    [itemId]
  );

  return mapCartRow(rows[0]);
};

export const getCartItems = async (req, res, next) => {
  try {
    const items = await fetchCartItemsByUser(req.user.id);
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};

export const addCartItem = async (req, res, next) => {
  try {
    const item = await createCartItem({
      userId: req.user.id,
      payload: req.body
    });

    return res.status(201).json({
      message: "Added to cart successfully.",
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return res.status(400).json({ message: "Invalid cart item id." });
    }

    const { rows } = await pool.query(
      "SELECT * FROM cart_items WHERE id = $1 AND user_id = $2 LIMIT 1",
      [itemId, req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    const current = rows[0];
    const nextQuantity =
      req.body.quantity === undefined
        ? Number(current.quantity)
        : Math.min(Math.max(Number(req.body.quantity) || 1, 1), 99);
    const nextSize =
      req.body.selectedSize === undefined
        ? current.selected_size
        : String(req.body.selectedSize || "").trim().toUpperCase() || null;
    const nextSides =
      req.body.selectedSides === undefined
        ? current.selected_sides || []
        : normalizeSides(req.body.selectedSides);
    const nextCustomizationState =
      req.body.customizationState === undefined
        ? normalizeCustomizationState(current.customization_state)
        : normalizeCustomizationState(req.body.customizationState);
    const nextPreviewImage =
      req.body.previewImage === undefined
        ? current.preview_image
        : String(req.body.previewImage || "").trim() || null;

    await pool.query(
      `
        UPDATE cart_items
        SET
          selected_size = $1,
          quantity = $2,
          selected_sides = $3::TEXT[],
          customization_state = $4::JSONB,
          preview_image = $5,
          updated_at = NOW()
        WHERE id = $6 AND user_id = $7
      `,
      [
        nextSize,
        nextQuantity,
        nextSides,
        JSON.stringify(nextCustomizationState),
        nextPreviewImage,
        itemId,
        req.user.id
      ]
    );

    const items = await fetchCartItemsByUser(req.user.id);
    return res.status(200).json({
      message: "Cart updated successfully.",
      items
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteCartItem = async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return res.status(400).json({ message: "Invalid cart item id." });
    }

    await pool.query("DELETE FROM cart_items WHERE id = $1 AND user_id = $2", [itemId, req.user.id]);
    const items = await fetchCartItemsByUser(req.user.id);

    return res.status(200).json({
      message: "Removed from cart.",
      items
    });
  } catch (error) {
    return next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cart_items WHERE user_id = $1", [req.user.id]);
    return res.status(200).json({
      message: "Cart cleared successfully.",
      items: []
    });
  } catch (error) {
    return next(error);
  }
};

export const mergeGuestCart = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      const current = await fetchCartItemsByUser(req.user.id);
      return res.status(200).json({ message: "No guest items to import.", items: current });
    }

    await client.query("BEGIN");

    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await createCartItem({
        userId: req.user.id,
        payload: item,
        client
      });
    }

    await client.query("COMMIT");

    const merged = await fetchCartItemsByUser(req.user.id);
    return res.status(200).json({
      message: "Guest cart imported successfully.",
      items: merged
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
};
