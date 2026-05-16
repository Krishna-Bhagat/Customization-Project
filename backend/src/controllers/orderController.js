import { toSideKey } from "../constants/productMeta.js";
import { sendOrderEmail } from "../services/emailService.js";

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

export const createOrder = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      address,
      productName,
      productId,
      category,
      selectedSize,
      selectedSides
    } = req.body;

    const designUrls = normalizeDesignUrls(req.body);

    const hasAnyDesignUrl = Object.keys(designUrls).length > 0;
    if (!name || !phone || !address || !hasAnyDesignUrl) {
      return res.status(400).json({
        message: "Name, phone, address and at least one design URL are required."
      });
    }

    const normalizedSelectedSides = Array.isArray(selectedSides)
      ? selectedSides.map((side) => String(side).trim()).filter(Boolean)
      : [];

    await sendOrderEmail({
      name: String(name).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      productName: productName ? String(productName).trim() : "",
      productId: productId ? String(productId).trim() : "",
      category: category ? String(category).trim() : "",
      selectedSize: selectedSize ? String(selectedSize).trim().toUpperCase() : "",
      selectedSides: normalizedSelectedSides,
      designUrls
    });

    return res.status(201).json({ message: "Order placed successfully." });
  } catch (error) {
    next(error);
  }
};