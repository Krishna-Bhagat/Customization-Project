import { pool } from "./pool.js";
import {
  DEFAULT_CATEGORY_CONFIGS,
  DEFAULT_SIDE_OPTIONS,
  SIZE_OPTIONS,
  getPrintableAreaPreset,
  toSideKey,
  toSlug
} from "../constants/productMeta.js";

export const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        slug VARCHAR(140) NOT NULL UNIQUE,
        supports_sizes BOOLEAN NOT NULL DEFAULT TRUE,
        allowed_sizes TEXT[] NOT NULL DEFAULT ARRAY['XS','S','M','L','XL','XXL']::TEXT[],
        customization_sides TEXT[] NOT NULL DEFAULT ARRAY['Front','Back']::TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(120) NOT NULL DEFAULT 'T-Shirt',
        price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
        image_url TEXT NOT NULL,
        image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        gallery_images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        available_sizes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS product_sides (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        side_name VARCHAR(120) NOT NULL,
        side_key VARCHAR(120) NOT NULL,
        mockup_image TEXT NOT NULL,
        printable_area_x INTEGER NOT NULL DEFAULT 90,
        printable_area_y INTEGER NOT NULL DEFAULT 108,
        printable_area_width INTEGER NOT NULL DEFAULT 150,
        printable_area_height INTEGER NOT NULL DEFAULT 198,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_id, side_key)
      );
    `);

    await client.query(
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS supports_sizes BOOLEAN NOT NULL DEFAULT TRUE"
    );
    await client.query(
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS allowed_sizes TEXT[] NOT NULL DEFAULT ARRAY['XS','S','M','L','XL','XXL']::TEXT[]"
    );
    await client.query(
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS customization_sides TEXT[] NOT NULL DEFAULT ARRAY['Front','Back']::TEXT[]"
    );

    await client.query(
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(120) NOT NULL DEFAULT 'T-Shirt'"
    );
    await client.query(
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT"
    );
    await client.query(
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS available_sizes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]"
    );
    await client.query(
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]"
    );
    await client.query(
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]"
    );

    await client.query(
      "UPDATE categories SET allowed_sizes = $1::TEXT[] WHERE supports_sizes = TRUE AND (allowed_sizes IS NULL OR array_length(allowed_sizes, 1) IS NULL)",
      [SIZE_OPTIONS]
    );
    await client.query(
      "UPDATE categories SET allowed_sizes = ARRAY[]::TEXT[] WHERE supports_sizes = FALSE"
    );
    await client.query(
      "UPDATE categories SET customization_sides = $1::TEXT[] WHERE customization_sides IS NULL OR array_length(customization_sides, 1) IS NULL",
      [DEFAULT_SIDE_OPTIONS]
    );

    await client.query(
      "UPDATE products SET category = 'T-Shirt' WHERE category IS NULL OR TRIM(category) = ''"
    );
    await client.query(
      "UPDATE products SET image_urls = ARRAY[image_url]::TEXT[] WHERE (image_urls IS NULL OR array_length(image_urls, 1) IS NULL) AND image_url IS NOT NULL AND TRIM(image_url) <> ''"
    );
    await client.query(
      "UPDATE products SET gallery_images = image_urls WHERE (gallery_images IS NULL OR array_length(gallery_images, 1) IS NULL) AND image_urls IS NOT NULL AND array_length(image_urls, 1) IS NOT NULL"
    );
    await client.query(
      "UPDATE products SET gallery_images = ARRAY[image_url]::TEXT[] WHERE (gallery_images IS NULL OR array_length(gallery_images, 1) IS NULL) AND image_url IS NOT NULL AND TRIM(image_url) <> ''"
    );
    await client.query(
      "UPDATE products SET image_url = COALESCE(gallery_images[1], image_urls[1], image_url) WHERE image_url IS NULL OR TRIM(image_url) = ''"
    );

    for (const config of DEFAULT_CATEGORY_CONFIGS) {
      await client.query(
        `
          INSERT INTO categories (name, slug, supports_sizes, allowed_sizes, customization_sides)
          VALUES ($1, $2, $3, $4::TEXT[], $5::TEXT[])
          ON CONFLICT (slug) DO NOTHING
        `,
        [
          config.name,
          toSlug(config.name),
          config.supportsSizes,
          config.supportsSizes ? config.allowedSizes : [],
          config.customizationSides
        ]
      );

      await client.query(
        `
          UPDATE categories
          SET
            supports_sizes = COALESCE(supports_sizes, $2::BOOLEAN),
            allowed_sizes = CASE
              WHEN supports_sizes = FALSE THEN ARRAY[]::TEXT[]
              WHEN allowed_sizes IS NULL OR array_length(allowed_sizes, 1) IS NULL THEN $3::TEXT[]
              ELSE allowed_sizes
            END,
            customization_sides = CASE
              WHEN customization_sides IS NULL OR array_length(customization_sides, 1) IS NULL THEN $4::TEXT[]
              ELSE customization_sides
            END
          WHERE LOWER(name) = LOWER($1)
        `,
        [
          config.name,
          config.supportsSizes,
          config.supportsSizes ? config.allowedSizes : [],
          config.customizationSides
        ]
      );
    }

    for (const config of DEFAULT_CATEGORY_CONFIGS) {
      for (const sideName of config.customizationSides || []) {
        const sideKey = toSideKey(sideName);
        const area = getPrintableAreaPreset({ category: config.name, side: sideName });

        await client.query(
          `
            UPDATE product_sides ps
            SET
              printable_area_x = $1,
              printable_area_y = $2,
              printable_area_width = $3,
              printable_area_height = $4
            FROM products p
            WHERE ps.product_id = p.id
              AND LOWER(p.category) = LOWER($5)
              AND ps.side_key = $6
              AND ps.printable_area_x = 72
              AND ps.printable_area_y = 90
              AND ps.printable_area_width = 186
              AND ps.printable_area_height = 236
          `,
          [area.x, area.y, area.width, area.height, config.name, sideKey]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
