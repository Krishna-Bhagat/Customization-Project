import { v2 as cloudinary } from "cloudinary";
import path from "path";
import heicConvert from "heic-convert";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret
});

export const uploadBase64Image = async (dataUri, folder) => {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image"
  });

  return result.secure_url;
};

const isHeicLike = ({ fileName = "", mimeType = "" }) => {
  const extension = path.extname(String(fileName || "")).toLowerCase();
  const normalizedMime = String(mimeType || "").toLowerCase();

  return (
    [".heic", ".heif"].includes(extension) ||
    normalizedMime.includes("heic") ||
    normalizedMime.includes("heif")
  );
};

const convertHeicBuffer = async ({ buffer, targetFormat }) => {
  const result = await heicConvert({
    buffer: Uint8Array.from(buffer),
    format: targetFormat,
    quality: targetFormat === "JPEG" ? 0.92 : 1
  });

  return Buffer.isBuffer(result) ? result : Buffer.from(result);
};

const normalizeUploadAsset = async ({ buffer, fileName, mimeType, kind }) => {
  if (!isHeicLike({ fileName, mimeType })) {
    return {
      buffer,
      fileName
    };
  }

  const nextFormat = kind === "mockup" ? "PNG" : "JPEG";
  const nextExtension = nextFormat === "PNG" ? ".png" : ".jpg";
  const stem = String(fileName || "upload").replace(/\.[^/.]+$/, "") || "upload";
  const nextBuffer = await convertHeicBuffer({ buffer, targetFormat: nextFormat });

  return {
    buffer: nextBuffer,
    fileName: `${stem}${nextExtension}`
  };
};

export const uploadBufferImage = async (
  buffer,
  folder,
  fileName = "upload",
  { mimeType = "", kind = "gallery" } = {}
) =>
  new Promise(async (resolve, reject) => {
    let normalizedAsset;

    try {
      normalizedAsset = await normalizeUploadAsset({
        buffer,
        fileName,
        mimeType,
        kind
      });
    } catch (error) {
      reject(error);
      return;
    }

    const baseName = normalizedAsset.fileName.replace(/\.[^/.]+$/, "");
    const safeBaseName =
      baseName
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "upload";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${Date.now()}-${safeBaseName}`,
        resource_type: "image",
        quality: kind === "gallery" ? "auto:good" : undefined,
        fetch_format: kind === "gallery" ? "auto" : undefined
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(normalizedAsset.buffer);
  });
