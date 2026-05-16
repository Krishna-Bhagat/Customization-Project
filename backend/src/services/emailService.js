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
  const safeDesignEntries = Object.entries(designUrls || {}).filter(([, url]) => Boolean(url));

  const designRows = safeDesignEntries
    .map(
      ([side, url]) =>
        `<p><strong>${formatSideLabel(side)} Design:</strong> <a href="${url}" target="_blank" rel="noreferrer">View ${formatSideLabel(side)}</a></p>`
    )
    .join("");

  const html = `
    <h2>New Custom Clothing Order</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Address:</strong> ${address}</p>
    <p><strong>Product:</strong> ${productName || "N/A"} (${productId || "N/A"})</p>
    <p><strong>Category:</strong> ${category || "N/A"}</p>
    <p><strong>Selected Size:</strong> ${selectedSize || "N/A"}</p>
    <p><strong>Selected Sides:</strong> ${(selectedSides || []).map((side) => formatSideLabel(side)).join(", ") || "N/A"}</p>
    ${designRows || "<p><strong>Design URLs:</strong> N/A</p>"}
  `;

  await transporter.sendMail({
    from: env.fromEmail,
    to: env.adminEmail,
    subject: "New Custom Clothing Order",
    html
  });
};
