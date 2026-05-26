import { pool } from "./pool.js";
import { DEFAULT_CATEGORY_CONFIGS, toSlug } from "../constants/productMeta.js";
import { logger } from "../utils/logger.js";

export const initializeDatabase = async () => {
  logger.info("Initializing database schema and seed data");
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
        gallery_images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        search_slugs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(180) NOT NULL,
        phone VARCHAR(10) NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{10}$'),
        email VARCHAR(255),
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
      ON users (LOWER(email))
      WHERE email IS NOT NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        province VARCHAR(120) NOT NULL,
        district VARCHAR(120) NOT NULL,
        municipality_city VARCHAR(140) NOT NULL,
        ward_number VARCHAR(32) NOT NULL,
        street_tole VARCHAR(255) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS addresses_default_unique_idx
      ON addresses (user_id)
      WHERE is_default = TRUE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        selected_size VARCHAR(40),
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        selected_sides TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        customization_state JSONB NOT NULL DEFAULT '{}'::JSONB,
        preview_image TEXT,
        product_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS cart_items_user_idx
      ON cart_items (user_id, updated_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS drafts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        selected_size VARCHAR(40),
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        selected_sides TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        active_side VARCHAR(120),
        canvas_states JSONB NOT NULL DEFAULT '{}'::JSONB,
        design_exports JSONB NOT NULL DEFAULT '{}'::JSONB,
        preview_image TEXT,
        saved_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS drafts_user_idx
      ON drafts (user_id, updated_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_number VARCHAR(40) NOT NULL UNIQUE,
        name_snapshot VARCHAR(180) NOT NULL,
        phone_snapshot VARCHAR(32) NOT NULL,
        email_snapshot VARCHAR(255),
        address_snapshot JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS orders_user_idx
      ON orders (user_id, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS orders_status_idx
      ON orders (status, created_at DESC);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
      ON orders (order_number)
      WHERE order_number IS NOT NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(120),
        size VARCHAR(40),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        line_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
        selected_sides TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        design_urls JSONB NOT NULL DEFAULT '{}'::JSONB,
        customization_data JSONB NOT NULL DEFAULT '{}'::JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    for (const config of DEFAULT_CATEGORY_CONFIGS) {
      await client.query(
        `
          INSERT INTO categories (name, slug, supports_sizes, allowed_sizes, customization_sides)
          VALUES ($1, $2, $3, $4::TEXT[], $5::TEXT[])
          ON CONFLICT (slug)
          DO UPDATE SET
            name = EXCLUDED.name,
            supports_sizes = EXCLUDED.supports_sizes,
            allowed_sizes = EXCLUDED.allowed_sizes,
            customization_sides = EXCLUDED.customization_sides,
            updated_at = NOW()
        `,
        [
          config.name,
          toSlug(config.name),
          config.supportsSizes,
          config.supportsSizes ? config.allowedSizes : [],
          config.customizationSides
        ]
      );
    }

    await client.query("COMMIT");
    logger.success("Database schema and seed data are ready");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Database initialization transaction failed", error);
    throw error;
  } finally {
    client.release();
  }
};
