import { pool } from "../db/pool.js";
import { toSideKey } from "../constants/productMeta.js";
import { uploadBase64Image } from "../services/cloudinaryService.js";
import {
  sendAdminOrderNotification,
  sendOrderConfirmationEmail,
  sendOrderEmail
} from "../services/emailService.js";
import { fetchUserProfileById } from "../utils/userProfile.js";

const ORDER_STATUSES = ["pending", "confirmed", "dispatched", "delivered"];
const ORDER_STATUS_TRANSITIONS = {
  pending: "confirmed",
  confirmed: "dispatched",
  dispatched: "delivered",
  delivered: null
};

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeDesignUrls = (body = {}) => {
  const urls = {};

  if (body.designUrls && typeof body.designUrls === "object") {
    Object.entries(body.designUrls).forEach(([side, url]) => {
      if (!url) {
        return;
      }
      urls[toSideKey(side)] = String(url).trim();
    });
  }

  const legacy = {
    front: body.frontDesignUrl,
    back: body.backDesignUrl,
    leftSleeve: body.leftSleeveDesignUrl,
    rightSleeve: body.rightSleeveDesignUrl
  };

  Object.entries(legacy).forEach(([side, url]) => {
    if (!url) {
      return;
    }
    urls[toSideKey(side)] = String(url).trim();
  });

  return Object.fromEntries(Object.entries(urls).filter(([, url]) => Boolean(url)));
};

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

const buildOrderNumber = (orderId) => {
  const year = new Date().getFullYear();
  return `GC-${year}-${String(orderId).padStart(6, "0")}`;
};

const sanitizeAddressSnapshot = (address) => {
  if (!address || typeof address !== "object") {
    return null;
  }

  const province = String(address.province || "").trim();
  const district = String(address.district || "").trim();
  const municipalityCity = String(address.municipalityCity || "").trim();
  const wardNumber = String(address.wardNumber || "").trim();
  const streetTole = String(address.streetTole || "").trim();

  if (!province || !district || !municipalityCity || !wardNumber || !streetTole) {
    return null;
  }

  return {
    province,
    district,
    municipalityCity,
    wardNumber,
    streetTole
  };
};

const normalizeCustomizationData = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const getRangeFilterSql = (range) => {
  const token = String(range || "all").toLowerCase();

  if (token === "today") {
    return "o.created_at >= date_trunc('day', NOW())";
  }
  if (token === "week") {
    return "o.created_at >= date_trunc('week', NOW())";
  }
  if (token === "month") {
    return "o.created_at >= date_trunc('month', NOW())";
  }

  return "TRUE";
};

const uploadDesignExports = async ({ orderFolder, itemIndex, designExports = {} }) => {
  const urls = {};
  const entries = Object.entries(designExports || {}).filter(([, value]) => Boolean(value));

  for (const [side, dataUri] of entries) {
    const sideKey = toSideKey(side);
    if (!sideKey) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const url = await uploadBase64Image(dataUri, `${orderFolder}/item-${itemIndex}`);
    urls[sideKey] = url;
  }

  return urls;
};

const fetchProductsForOrder = async (productIds, client = pool) => {
  const ids = Array.from(new Set(productIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (ids.length === 0) {
    return new Map();
  }

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
      WHERE id = ANY($1::INT[])
    `,
    [ids]
  );

  return new Map(rows.map((row) => [Number(row.id), row]));
};

const mapUserOrderRows = (rows) =>
  rows.map((row) => ({
    id: Number(row.id),
    orderNumber: row.order_number,
    status: row.status,
    subtotalAmount: Number(row.subtotal_amount),
    shippingAmount: Number(row.shipping_amount),
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    addressSnapshot: row.address_snapshot || null,
    items: Array.isArray(row.items) ? row.items : []
  }));

const mapAdminOrderRows = (rows) =>
  rows.map((row) => ({
    id: Number(row.id),
    orderNumber: row.order_number,
    status: row.status,
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.full_name,
    customerPhone: row.phone,
    customerEmail: row.email || "",
    productSummary: row.product_summary || "",
    totalQuantity: Number(row.total_quantity || 0)
  }));

export const createOrder = async (req, res, next) => {
  try {
    const { name, phone, address, productName, productId, category, selectedSize, selectedSides } = req.body;

    const designUrls = normalizeDesignUrls(req.body);
    const hasAnyDesignUrl = Object.keys(designUrls).length > 0;

    if (!name || !phone || !address || !hasAnyDesignUrl) {
      return res.status(400).json({
        message: "Name, phone, address and at least one design URL are required."
      });
    }

    await sendOrderEmail({
      name: String(name).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      productName: productName ? String(productName).trim() : "",
      productId: productId ? String(productId).trim() : "",
      category: category ? String(category).trim() : "",
      selectedSize: selectedSize ? String(selectedSize).trim().toUpperCase() : "",
      selectedSides: Array.isArray(selectedSides) ? selectedSides : [],
      designUrls
    });

    return res.status(201).json({ message: "Order placed successfully." });
  } catch (error) {
    return next(error);
  }
};

export const createUserOrder = async (req, res, next) => {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const userId = req.user.id;
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (requestedItems.length === 0) {
      return res.status(400).json({ message: "At least one order item is required." });
    }

    const user = await fetchUserProfileById(userId, client);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const addressSnapshot = sanitizeAddressSnapshot(req.body.addressSnapshot) || user.defaultAddress;
    if (!addressSnapshot) {
      return res.status(400).json({
        message: "Default address not found. Please update your profile address first."
      });
    }

    const productIds = requestedItems.map((item) => Number(item.productId));
    const productMap = await fetchProductsForOrder(productIds, client);

    const preparedItems = [];
    for (let index = 0; index < requestedItems.length; index += 1) {
      const inputItem = requestedItems[index];
      const productId = Number(inputItem.productId);
      const product = productMap.get(productId);

      if (!product) {
        return res.status(404).json({
          message: `Product not found for item #${index + 1}.`
        });
      }

      const quantity = Math.min(Math.max(Number(inputItem.quantity) || 1, 1), 99);
      const selectedSize = String(inputItem.selectedSize || "").trim().toUpperCase();
      const selectedSides = normalizeSides(inputItem.selectedSides);
      const customizationData = normalizeCustomizationData(inputItem.customizationData);

      let designUrls = normalizeDesignUrls(inputItem);
      if (Object.keys(designUrls).length === 0 && customizationData.designExports) {
        // eslint-disable-next-line no-await-in-loop
        designUrls = await uploadDesignExports({
          orderFolder: `custom-tee/orders/user-${userId}`,
          itemIndex: index + 1,
          designExports: customizationData.designExports
        });
      }

      if (Object.keys(designUrls).length === 0) {
        return res.status(400).json({
          message: `Design data missing for item #${index + 1}.`
        });
      }

      const unitPrice = toNumber(product.price);
      const lineTotal = unitPrice * quantity;

      preparedItems.push({
        productId,
        productName: product.name,
        category: product.category,
        selectedSize,
        quantity,
        selectedSides,
        unitPrice,
        lineTotal,
        designUrls,
        customizationData
      });
    }

    const subtotalAmount = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingAmount = 0;
    const totalAmount = subtotalAmount + shippingAmount;

    await client.query("BEGIN");
    inTransaction = true;

    const temporaryOrderNumber = `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const orderInsert = await client.query(
      `
        INSERT INTO orders (
          user_id,
          order_number,
          name_snapshot,
          phone_snapshot,
          email_snapshot,
          address_snapshot,
          status,
          subtotal_amount,
          shipping_amount,
          total_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6::JSONB, 'pending', $7, $8, $9)
        RETURNING id, created_at
      `,
      [
        userId,
        temporaryOrderNumber,
        user.fullName,
        user.phone,
        user.email || null,
        JSON.stringify(addressSnapshot),
        subtotalAmount,
        shippingAmount,
        totalAmount
      ]
    );

    const orderId = Number(orderInsert.rows[0].id);
    const orderNumber = buildOrderNumber(orderId);

    await client.query("UPDATE orders SET order_number = $1 WHERE id = $2", [orderNumber, orderId]);

    for (const item of preparedItems) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            category,
            size,
            quantity,
            unit_price,
            line_total,
            selected_sides,
            design_urls,
            customization_data
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::TEXT[], $10::JSONB, $11::JSONB)
        `,
        [
          orderId,
          item.productId,
          item.productName,
          item.category,
          item.selectedSize || null,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          item.selectedSides,
          JSON.stringify(item.designUrls),
          JSON.stringify(item.customizationData)
        ]
      );
    }

    await client.query("COMMIT");
    inTransaction = false;

    const notificationItems = preparedItems.map((item) => ({
      ...item
    }));

    await Promise.allSettled([
      sendAdminOrderNotification({
        orderNumber,
        customer: {
          fullName: user.fullName,
          phone: user.phone,
          email: user.email || ""
        },
        addressSnapshot,
        items: notificationItems,
        totalAmount,
        status: "pending"
      }),
      sendOrderConfirmationEmail({
        to: user.email || "",
        customerName: user.fullName,
        orderNumber,
        items: notificationItems,
        totalAmount,
        addressSnapshot,
        status: "pending"
      })
    ]);

    return res.status(201).json({
      message: "Order placed successfully.",
      order: {
        id: orderId,
        orderNumber,
        status: "pending",
        totalAmount,
        createdAt: orderInsert.rows[0].created_at,
        items: notificationItems
      }
    });
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }
    return next(error);
  } finally {
    client.release();
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          o.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'productId', oi.product_id,
                'productName', oi.product_name,
                'category', oi.category,
                'selectedSize', oi.size,
                'quantity', oi.quantity,
                'unitPrice', oi.unit_price,
                'lineTotal', oi.line_total,
                'selectedSides', oi.selected_sides,
                'designUrls', oi.design_urls
              )
              ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::JSON
          ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      orders: mapUserOrderRows(rows)
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const range = String(req.query.range || "all").toLowerCase();
    const search = String(req.query.search || "").trim().toLowerCase();
    const rangeSql = getRangeFilterSql(range);

    const params = [];
    let searchSql = "TRUE";
    if (search) {
      params.push(`%${search}%`);
      searchSql = `(LOWER(o.order_number) LIKE $${params.length} OR LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.phone) LIKE $${params.length})`;
    }

    const query = `
      SELECT
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at,
        u.full_name,
        u.phone,
        u.email,
        COALESCE(STRING_AGG(DISTINCT oi.product_name, ', '), '') AS product_summary,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE ${rangeSql}
        AND ${searchSql}
      GROUP BY o.id, u.id
      ORDER BY o.created_at DESC
      LIMIT 500
    `;

    const { rows } = await pool.query(query, params);
    return res.status(200).json({
      orders: mapAdminOrderRows(rows)
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOrderStats = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          (SELECT COUNT(*)::INT FROM orders WHERE created_at >= date_trunc('day', NOW())) AS orders_today,
          (SELECT COUNT(*)::INT FROM orders WHERE created_at >= date_trunc('week', NOW())) AS orders_this_week,
          (SELECT COUNT(*)::INT FROM orders WHERE status = 'pending') AS pending_orders
      `
    );

    return res.status(200).json({
      ordersToday: Number(rows[0]?.orders_today || 0),
      ordersThisWeek: Number(rows[0]?.orders_this_week || 0),
      pendingOrders: Number(rows[0]?.pending_orders || 0)
    });
  } catch (error) {
    return next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const status = String(req.body.status || "").trim().toLowerCase();

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order id." });
    }

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    const { rows } = await pool.query(
      "SELECT id, status, order_number, user_id FROM orders WHERE id = $1 LIMIT 1",
      [orderId]
    );
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const currentStatus = String(order.status || "").toLowerCase();
    const allowedNext = ORDER_STATUS_TRANSITIONS[currentStatus];

    if (status !== currentStatus && status !== allowedNext) {
      return res.status(400).json({
        message: `Invalid transition. ${currentStatus} can only move to ${allowedNext || "no further status"}.`
      });
    }

    await pool.query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [status, orderId]);

    return res.status(200).json({
      message: "Order status updated successfully.",
      order: {
        id: orderId,
        orderNumber: order.order_number,
        status
      }
    });
  } catch (error) {
    return next(error);
  }
};
