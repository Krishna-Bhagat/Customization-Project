import { pool } from "../db/pool.js";
import { DEFAULT_PRINTABLE_AREA, getPrintableAreaPreset, toSideKey } from "../constants/productMeta.js";
import { uploadBufferImage } from "../services/cloudinaryService.js";
import { parseSizesInput } from "../utils/sizeParser.js";
import { parseSidesInput } from "../utils/sideParser.js";
import path from "path";

const parseObjectInput = (input) => {
  if (!input) {
    return {};
  }

  if (typeof input === "object" && !Array.isArray(input)) {
    return input;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }

  return {};
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const normalizePrintableArea = (candidate, fallbackArea = DEFAULT_PRINTABLE_AREA) => {
  const width = Math.min(Math.max(toInt(candidate?.width, fallbackArea.width), 24), 330);
  const height = Math.min(Math.max(toInt(candidate?.height, fallbackArea.height), 24), 430);
  const maxX = Math.max(0, 330 - width);
  const maxY = Math.max(0, 430 - height);

  return {
    x: Math.min(Math.max(toInt(candidate?.x, fallbackArea.x), 0), maxX),
    y: Math.min(Math.max(toInt(candidate?.y, fallbackArea.y), 0), maxY),
    width,
    height
  };
};

const pickCategorySide = (allowedSides, requestedSide) => {
  const requestedKey = toSideKey(requestedSide);

  const exact = allowedSides.find((side) => toSideKey(side) === requestedKey);
  return exact || "";
};

const GALLERY_ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".webp", ".heic", ".heif"]);
const GALLERY_ALLOWED_MIME_PREFIX = ["image/jpeg", "image/webp", "image/heic", "image/heif"];

const MOCKUP_ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"]);
const MOCKUP_ALLOWED_MIME_PREFIX = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif"
];

const getFileExtension = (fileName) => path.extname(String(fileName || "")).toLowerCase();

const isAllowedImageFile = (file, { extensions, mimePrefixes }) => {
  const extension = getFileExtension(file?.originalname);
  const mimeType = String(file?.mimetype || "").toLowerCase();

  if (extensions.has(extension)) {
    return true;
  }

  return mimePrefixes.some((prefix) => mimeType.startsWith(prefix));
};

const validateFilesByType = (files, typeConfig) =>
  files.every((file) => isAllowedImageFile(file, typeConfig));

export const getProducts = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const size = String(req.query.size || "")
      .trim()
      .toUpperCase();

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`p.name ILIKE $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (size) {
      params.push(size);
      conditions.push(`$${params.length} = ANY(p.available_sizes)`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.category,
          p.price,
          COALESCE(p.gallery_images[1], p.image_urls[1], p.image_url) AS "imageUrl",
          CASE
            WHEN p.gallery_images IS NOT NULL AND array_length(p.gallery_images, 1) IS NOT NULL THEN p.gallery_images
            WHEN p.image_urls IS NOT NULL AND array_length(p.image_urls, 1) IS NOT NULL THEN p.image_urls
            WHEN p.image_url IS NOT NULL AND TRIM(p.image_url) <> '' THEN ARRAY[p.image_url]::TEXT[]
            ELSE ARRAY[]::TEXT[]
          END AS "imageUrls",
          CASE
            WHEN p.gallery_images IS NOT NULL AND array_length(p.gallery_images, 1) IS NOT NULL THEN p.gallery_images
            WHEN p.image_urls IS NOT NULL AND array_length(p.image_urls, 1) IS NOT NULL THEN p.image_urls
            WHEN p.image_url IS NOT NULL AND TRIM(p.image_url) <> '' THEN ARRAY[p.image_url]::TEXT[]
            ELSE ARRAY[]::TEXT[]
          END AS "galleryImages",
          p.available_sizes AS "availableSizes",
          p.created_at AS "createdAt",
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ps.id,
                  'sideName', ps.side_name,
                  'sideKey', ps.side_key,
                  'mockupImage', ps.mockup_image,
                  'printableArea', json_build_object(
                    'x', ps.printable_area_x,
                    'y', ps.printable_area_y,
                    'width', ps.printable_area_width,
                    'height', ps.printable_area_height
                  )
                )
                ORDER BY ps.id
              )
              FROM product_sides ps
              WHERE ps.product_id = p.id
            ),
            '[]'::json
          ) AS "sides"
        FROM products p
        ${whereClause}
        ORDER BY p.created_at DESC
      `,
      params
    );

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { name, price } = req.body;
    const description =
      typeof req.body.description === "string" ? req.body.description.trim().slice(0, 2000) : "";
    const categoryInput = String(req.body.category || "").trim();
    const requestedSizes = parseSizesInput(req.body.availableSizes);
    const requestedSides = parseSidesInput(req.body.enabledSides);
    const sideConfigsInput = parseObjectInput(req.body.sideConfigs);
    const files = Array.isArray(req.files) ? req.files : [];

    const galleryFiles = files.filter((file) =>
      ["galleryImages", "images", "image"].includes(file.fieldname)
    );

    const sideMockupFiles = files
      .filter((file) => file.fieldname.startsWith("sideMockup_"))
      .reduce((acc, file) => {
        const sideKey = file.fieldname.replace("sideMockup_", "").trim().toLowerCase();
        if (sideKey) {
          acc[sideKey] = file;
        }
        return acc;
      }, {});

    if (!name || !price || !categoryInput) {
      return res.status(400).json({ message: "Name, category and price are required to create product." });
    }

    if (galleryFiles.length === 0) {
      return res.status(400).json({
        message: "Upload at least one customer gallery image (JPG, JPEG, WEBP, or HEIC)."
      });
    }

    if (
      !validateFilesByType(galleryFiles, {
        extensions: GALLERY_ALLOWED_EXTENSIONS,
        mimePrefixes: GALLERY_ALLOWED_MIME_PREFIX
      })
    ) {
      return res.status(400).json({
        message: "Gallery images must be JPG, JPEG, WEBP, or HEIC/HEIF."
      });
    }

    const priceNumber = Number(price);
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ message: "Price must be a valid positive number." });
    }

    const { rows: categoryRows } = await client.query(
      `
        SELECT
          name,
          slug,
          supports_sizes AS "supportsSizes",
          allowed_sizes AS "allowedSizes",
          customization_sides AS "customizationSides"
        FROM categories
        WHERE LOWER(name) = LOWER($1) OR slug = $1
        LIMIT 1
      `,
      [categoryInput || "T-Shirt"]
    );

    if (categoryRows.length === 0) {
      return res.status(400).json({ message: "Selected category does not exist." });
    }

    const matchedCategory = categoryRows[0];
    const categorySides = matchedCategory.customizationSides || [];

    if (categorySides.length === 0) {
      return res.status(400).json({
        message: "Selected category has no customization sides configured. Update category settings first."
      });
    }

    const selectedSizes = matchedCategory.supportsSizes
      ? requestedSizes.length > 0
        ? requestedSizes
        : matchedCategory.allowedSizes
      : [];

    if (matchedCategory.supportsSizes) {
      const invalidSizes = selectedSizes.filter((size) => !matchedCategory.allowedSizes.includes(size));
      if (invalidSizes.length > 0) {
        return res.status(400).json({
          message: `Invalid sizes for ${matchedCategory.name}: ${invalidSizes.join(", ")}`
        });
      }

      if (selectedSizes.length === 0) {
        return res.status(400).json({
          message: `Select at least one size for ${matchedCategory.name}.`
        });
      }
    }

    const selectedSideNames =
      requestedSides.length > 0
        ? requestedSides
            .map((side) => pickCategorySide(categorySides, side))
            .filter(Boolean)
        : [...categorySides];

    const uniqueSelectedSideNames = Array.from(new Set(selectedSideNames));

    if (uniqueSelectedSideNames.length === 0) {
      return res.status(400).json({
        message: "Select at least one valid customization side for this product."
      });
    }

    const sideRowsInput = uniqueSelectedSideNames.map((sideName) => {
      const sideKey = toSideKey(sideName);
      const defaultArea = getPrintableAreaPreset({
        category: matchedCategory.name,
        side: sideName
      });

      const rawConfig =
        sideConfigsInput?.[sideKey] ||
        sideConfigsInput?.[sideName] ||
        sideConfigsInput?.[String(sideName).toLowerCase()] ||
        defaultArea;

      const sideMockupFile = sideMockupFiles[sideKey];

      return {
        sideName,
        sideKey,
        sideMockupFile,
        printableArea: normalizePrintableArea(rawConfig, defaultArea)
      };
    });

    const missingMockupSide = sideRowsInput.find((sideRow) => !sideRow.sideMockupFile);
    if (missingMockupSide) {
      return res.status(400).json({
        message: `Upload side mockup image for ${missingMockupSide.sideName}.`
      });
    }

    const invalidMockupSide = sideRowsInput.find(
      (sideRow) =>
        !isAllowedImageFile(sideRow.sideMockupFile, {
          extensions: MOCKUP_ALLOWED_EXTENSIONS,
          mimePrefixes: MOCKUP_ALLOWED_MIME_PREFIX
        })
    );
    if (invalidMockupSide) {
      return res.status(400).json({
        message: `Invalid mockup format for ${invalidMockupSide.sideName}. Use PNG, JPG, JPEG, WEBP, or HEIC/HEIF.`
      });
    }

    const uploadedSideRows = await Promise.all(
      sideRowsInput.map(async (sideRow) => {
        const mockupImageUrl = await uploadBufferImage(
          sideRow.sideMockupFile.buffer,
          `custom-tee/products/sides/${sideRow.sideKey}`,
          sideRow.sideMockupFile.originalname,
          {
            mimeType: sideRow.sideMockupFile.mimetype,
            kind: "mockup"
          }
        );

        return {
          ...sideRow,
          mockupImageUrl
        };
      })
    );

    const uploadedGalleryImages =
      await Promise.all(
        galleryFiles.map((file) =>
          uploadBufferImage(file.buffer, "custom-tee/products/gallery", file.originalname, {
            mimeType: file.mimetype,
            kind: "gallery"
          })
        )
      );

    const galleryImages = uploadedGalleryImages;

    const primaryImageUrl = galleryImages[0];

    if (!primaryImageUrl) {
      return res.status(400).json({
        message: "Upload at least one customer gallery image."
      });
    }

    await client.query("BEGIN");

    const { rows: productRows } = await client.query(
      `
        INSERT INTO products (
          name,
          description,
          category,
          price,
          image_url,
          image_urls,
          gallery_images,
          available_sizes
        )
        VALUES ($1, $2, $3, $4, $5, $6::TEXT[], $7::TEXT[], $8::TEXT[])
        RETURNING
          id,
          name,
          description,
          category,
          price,
          COALESCE(gallery_images[1], image_urls[1], image_url) AS "imageUrl",
          gallery_images AS "galleryImages",
          gallery_images AS "imageUrls",
          available_sizes AS "availableSizes",
          created_at AS "createdAt"
      `,
      [
        name.trim(),
        description || null,
        matchedCategory.name,
        priceNumber,
        primaryImageUrl,
        galleryImages,
        galleryImages,
        selectedSizes
      ]
    );

    const product = productRows[0];

    const sideInsertResults = [];

    for (const sideRow of uploadedSideRows) {
      const { rows: sideRows } = await client.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            side_name AS "sideName",
            side_key AS "sideKey",
            mockup_image AS "mockupImage",
            json_build_object(
              'x', printable_area_x,
              'y', printable_area_y,
              'width', printable_area_width,
              'height', printable_area_height
            ) AS "printableArea"
        `,
        [
          product.id,
          sideRow.sideName,
          sideRow.sideKey,
          sideRow.mockupImageUrl,
          sideRow.printableArea.x,
          sideRow.printableArea.y,
          sideRow.printableArea.width,
          sideRow.printableArea.height
        ]
      );

      sideInsertResults.push(sideRows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      ...product,
      sides: sideInsertResults
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

export const updateProduct = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const galleryFiles = files.filter((file) =>
      ["galleryImages", "images", "image"].includes(file.fieldname)
    );
    const sideMockupFiles = files
      .filter((file) => file.fieldname.startsWith("sideMockup_"))
      .reduce((acc, file) => {
        const sideKey = file.fieldname.replace("sideMockup_", "").trim().toLowerCase();
        if (sideKey) {
          acc[sideKey] = file;
        }
        return acc;
      }, {});

    if (
      galleryFiles.length > 0 &&
      !validateFilesByType(galleryFiles, {
        extensions: GALLERY_ALLOWED_EXTENSIONS,
        mimePrefixes: GALLERY_ALLOWED_MIME_PREFIX
      })
    ) {
      return res.status(400).json({
        message: "Gallery images must be JPG, JPEG, WEBP, or HEIC/HEIF."
      });
    }

    const sideMockupFileList = Object.values(sideMockupFiles);
    if (
      sideMockupFileList.length > 0 &&
      !validateFilesByType(sideMockupFileList, {
        extensions: MOCKUP_ALLOWED_EXTENSIONS,
        mimePrefixes: MOCKUP_ALLOWED_MIME_PREFIX
      })
    ) {
      return res.status(400).json({
        message: "Mockup images must be PNG, JPG, JPEG, WEBP, or HEIC/HEIF."
      });
    }

    const { rows: productRows } = await client.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.category,
          p.price,
          p.image_url AS "imageUrl",
          p.gallery_images AS "galleryImages",
          p.available_sizes AS "availableSizes",
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ps.id,
                  'sideName', ps.side_name,
                  'sideKey', ps.side_key,
                  'mockupImage', ps.mockup_image,
                  'printableArea', json_build_object(
                    'x', ps.printable_area_x,
                    'y', ps.printable_area_y,
                    'width', ps.printable_area_width,
                    'height', ps.printable_area_height
                  )
                )
                ORDER BY ps.id
              )
              FROM product_sides ps
              WHERE ps.product_id = p.id
            ),
            '[]'::json
          ) AS "sides"
        FROM products p
        WHERE p.id = $1
        LIMIT 1
      `,
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ message: "Product not found." });
    }

    const existingProduct = productRows[0];
    const existingSides = Array.isArray(existingProduct.sides) ? existingProduct.sides : [];
    const existingSideByKey = existingSides.reduce((acc, side) => {
      const key = toSideKey(side.sideKey || side.sideName);
      if (key) {
        acc[key] = side;
      }
      return acc;
    }, {});

    const nextName = String(req.body.name || existingProduct.name || "").trim();
    const nextDescription =
      typeof req.body.description === "string"
        ? req.body.description.trim().slice(0, 2000)
        : existingProduct.description || "";
    const categoryInput = String(req.body.category || existingProduct.category || "").trim();
    const nextPriceRaw =
      req.body.price !== undefined && String(req.body.price).trim() !== ""
        ? req.body.price
        : existingProduct.price;
    const nextPrice = Number(nextPriceRaw);

    if (!nextName || !categoryInput) {
      return res.status(400).json({ message: "Name and category are required." });
    }

    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid positive number." });
    }

    const { rows: categoryRows } = await client.query(
      `
        SELECT
          name,
          slug,
          supports_sizes AS "supportsSizes",
          allowed_sizes AS "allowedSizes",
          customization_sides AS "customizationSides"
        FROM categories
        WHERE LOWER(name) = LOWER($1) OR slug = $1
        LIMIT 1
      `,
      [categoryInput]
    );

    if (categoryRows.length === 0) {
      return res.status(400).json({ message: "Selected category does not exist." });
    }

    const matchedCategory = categoryRows[0];
    const categorySides = matchedCategory.customizationSides || [];
    if (categorySides.length === 0) {
      return res.status(400).json({
        message: "Selected category has no customization sides configured. Update category settings first."
      });
    }

    const hasSizeInput = req.body.availableSizes !== undefined;
    const requestedSizes = parseSizesInput(req.body.availableSizes);
    const selectedSizes = matchedCategory.supportsSizes
      ? hasSizeInput
        ? requestedSizes
        : (existingProduct.availableSizes || []).filter((size) =>
            (matchedCategory.allowedSizes || []).includes(size)
          )
      : [];

    if (matchedCategory.supportsSizes) {
      const invalidSizes = selectedSizes.filter((size) => !matchedCategory.allowedSizes.includes(size));
      if (invalidSizes.length > 0) {
        return res.status(400).json({
          message: `Invalid sizes for ${matchedCategory.name}: ${invalidSizes.join(", ")}`
        });
      }

      if (selectedSizes.length === 0) {
        return res.status(400).json({
          message: `Select at least one size for ${matchedCategory.name}.`
        });
      }
    }

    const hasSideInput = req.body.enabledSides !== undefined;
    const requestedSides = parseSidesInput(req.body.enabledSides);
    const fallbackExistingSides =
      existingSides.length > 0
        ? existingSides.map((side) => side.sideName).filter(Boolean)
        : [...categorySides];
    const sourceSides = hasSideInput ? requestedSides : fallbackExistingSides;

    const selectedSideNames = sourceSides
      .map((side) => pickCategorySide(categorySides, side))
      .filter(Boolean);
    const uniqueSelectedSideNames = Array.from(new Set(selectedSideNames));

    if (uniqueSelectedSideNames.length === 0) {
      return res.status(400).json({
        message: "Select at least one valid customization side for this product."
      });
    }

    const sideConfigsInput = parseObjectInput(req.body.sideConfigs);

    const resolvedSideRows = await Promise.all(
      uniqueSelectedSideNames.map(async (sideName) => {
        const sideKey = toSideKey(sideName);
        const defaultArea = getPrintableAreaPreset({
          category: matchedCategory.name,
          side: sideName
        });

        const existingSide = existingSideByKey[sideKey] || null;
        const rawConfig =
          sideConfigsInput?.[sideKey] ||
          sideConfigsInput?.[sideName] ||
          sideConfigsInput?.[String(sideName).toLowerCase()] ||
          existingSide?.printableArea ||
          defaultArea;

        const nextMockupFile = sideMockupFiles[sideKey] || null;
        let mockupImageUrl = existingSide?.mockupImage || "";

        if (nextMockupFile) {
          mockupImageUrl = await uploadBufferImage(
            nextMockupFile.buffer,
            `custom-tee/products/sides/${sideKey}`,
            nextMockupFile.originalname,
            {
              mimeType: nextMockupFile.mimetype,
              kind: "mockup"
            }
          );
        }

        if (!mockupImageUrl) {
          throw new Error(`Upload side mockup image for ${sideName}.`);
        }

        return {
          sideName,
          sideKey,
          mockupImageUrl,
          printableArea: normalizePrintableArea(rawConfig, defaultArea)
        };
      })
    );

    let nextGalleryImages = Array.isArray(existingProduct.galleryImages)
      ? existingProduct.galleryImages.filter(Boolean)
      : [];

    if (galleryFiles.length > 0) {
      nextGalleryImages = await Promise.all(
        galleryFiles.map((file) =>
          uploadBufferImage(file.buffer, "custom-tee/products/gallery", file.originalname, {
            mimeType: file.mimetype,
            kind: "gallery"
          })
        )
      );
    }

    if (nextGalleryImages.length === 0) {
      return res.status(400).json({
        message: "Upload at least one customer gallery image."
      });
    }

    const primaryImageUrl = nextGalleryImages[0];

    await client.query("BEGIN");

    const { rows: updatedProducts } = await client.query(
      `
        UPDATE products
        SET
          name = $1,
          description = $2,
          category = $3,
          price = $4,
          image_url = $5,
          image_urls = $6::TEXT[],
          gallery_images = $7::TEXT[],
          available_sizes = $8::TEXT[]
        WHERE id = $9
        RETURNING
          id,
          name,
          description,
          category,
          price,
          COALESCE(gallery_images[1], image_urls[1], image_url) AS "imageUrl",
          gallery_images AS "galleryImages",
          gallery_images AS "imageUrls",
          available_sizes AS "availableSizes",
          created_at AS "createdAt"
      `,
      [
        nextName,
        nextDescription || null,
        matchedCategory.name,
        nextPrice,
        primaryImageUrl,
        nextGalleryImages,
        nextGalleryImages,
        selectedSizes,
        productId
      ]
    );

    await client.query(
      `
        DELETE FROM product_sides
        WHERE product_id = $1
          AND NOT (side_key = ANY($2::TEXT[]))
      `,
      [productId, resolvedSideRows.map((side) => side.sideKey)]
    );

    const upsertedSides = [];

    for (const sideRow of resolvedSideRows) {
      const { rows: sideRows } = await client.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (product_id, side_key)
          DO UPDATE SET
            side_name = EXCLUDED.side_name,
            mockup_image = EXCLUDED.mockup_image,
            printable_area_x = EXCLUDED.printable_area_x,
            printable_area_y = EXCLUDED.printable_area_y,
            printable_area_width = EXCLUDED.printable_area_width,
            printable_area_height = EXCLUDED.printable_area_height
          RETURNING
            id,
            side_name AS "sideName",
            side_key AS "sideKey",
            mockup_image AS "mockupImage",
            json_build_object(
              'x', printable_area_x,
              'y', printable_area_y,
              'width', printable_area_width,
              'height', printable_area_height
            ) AS "printableArea"
        `,
        [
          productId,
          sideRow.sideName,
          sideRow.sideKey,
          sideRow.mockupImageUrl,
          sideRow.printableArea.x,
          sideRow.printableArea.y,
          sideRow.printableArea.width,
          sideRow.printableArea.height
        ]
      );

      upsertedSides.push(sideRows[0]);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      ...updatedProducts[0],
      sides: upsertedSides
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (String(error?.message || "").startsWith("Upload side mockup image")) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  } finally {
    client.release();
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.status(200).json({ message: "Product deleted." });
  } catch (error) {
    next(error);
  }
};
