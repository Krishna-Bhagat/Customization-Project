import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass
  }
});

const formatSideLabel = (key) =>
  String(key || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const toCurrency = (value) => `NPR ${Number(value || 0).toFixed(2)}`;

const formatAddressSnapshot = (snapshot) => {
  if (!snapshot) {
    return "N/A";
  }

  if (typeof snapshot === "string") {
    return snapshot;
  }

  return [
    snapshot.streetTole,
    `Ward ${snapshot.wardNumber}`,
    snapshot.municipalityCity,
    snapshot.district,
    snapshot.province
  ]
    .filter(Boolean)
    .join(", ");
};

const buildItemRows = (items = []) =>
  items
    .map((item, index) => {
      const designRows = Object.entries(item.designUrls || {})
        .filter(([, value]) => Boolean(value))
        .map(
          ([side, url]) =>
            `<li>${formatSideLabel(side)}: <a href="${url}" target="_blank" rel="noreferrer">View</a></li>`
        )
        .join("");

      return `
        <div style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;">
          <p><strong>Item ${index + 1}:</strong> ${item.productName || "Product"}</p>
          <p><strong>Category:</strong> ${item.category || "N/A"}</p>
          <p><strong>Size:</strong> ${item.selectedSize || "N/A"}</p>
          <p><strong>Quantity:</strong> ${item.quantity || 1}</p>
          <p><strong>Unit Price:</strong> ${toCurrency(item.unitPrice)}</p>
          <p><strong>Line Total:</strong> ${toCurrency(item.lineTotal)}</p>
          <p><strong>Sides:</strong> ${(item.selectedSides || []).map(formatSideLabel).join(", ") || "N/A"}</p>
          ${designRows ? `<p><strong>Design Links</strong></p><ul>${designRows}</ul>` : ""}
        </div>
      `;
    })
    .join("");

export const sendAdminOrderNotification = async ({
  orderNumber,
  customer,
  addressSnapshot,
  items,
  totalAmount,
  status = "pending"
}) => {
  const html = `
    <h2>New Ecommerce Order Received</h2>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <p><strong>Status:</strong> ${String(status).toUpperCase()}</p>
    <p><strong>Customer Name:</strong> ${customer?.fullName || "N/A"}</p>
    <p><strong>Phone:</strong> ${customer?.phone || "N/A"}</p>
    <p><strong>Email:</strong> ${customer?.email || "N/A"}</p>
    <p><strong>Address:</strong> ${formatAddressSnapshot(addressSnapshot)}</p>
    <p><strong>Total Amount:</strong> ${toCurrency(totalAmount)}</p>
    <hr />
    ${buildItemRows(items)}
  `;

  await transporter.sendMail({
    from: env.fromEmail,
    to: env.adminEmail,
    subject: `New Order ${orderNumber}`,
    html
  });
};

export const sendOrderConfirmationEmail = async ({
  to,
  customerName,
  orderNumber,
  items,
  totalAmount,
  addressSnapshot,
  status = "pending"
}) => {
  if (!to) {
    return;
  }

  const html = `
    <h2>Order Confirmation</h2>
    <p>Hi ${customerName || "Customer"},</p>
    <p>Your order has been placed successfully.</p>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <p><strong>Status:</strong> ${String(status).toUpperCase()}</p>
    <p><strong>Total Amount:</strong> ${toCurrency(totalAmount)}</p>
    <p><strong>Delivery Address:</strong> ${formatAddressSnapshot(addressSnapshot)}</p>
    <hr />
    ${buildItemRows(items)}
  `;

  await transporter.sendMail({
    from: env.fromEmail,
    to,
    subject: `Your Order ${orderNumber} is Confirmed`,
    html
  });
};

export const sendOrderEmail = async ({
  name,
  phone,
  address,
  productName,
  productId,
  category,
  selectedSize,
  selectedSides,
  designUrls
}) => {
  await sendAdminOrderNotification({
    orderNumber: productId ? `LEGACY-${productId}-${Date.now()}` : `LEGACY-${Date.now()}`,
    customer: {
      fullName: name,
      phone,
      email: ""
    },
    addressSnapshot: address,
    items: [
      {
        productName,
        category,
        selectedSize,
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        selectedSides,
        designUrls
      }
    ],
    totalAmount: 0,
    status: "pending"
  });
};
