import { pool } from "../db/pool.js";

const mapUserRow = (row) => ({
  id: Number(row.id),
  fullName: row.full_name,
  phone: row.phone,
  email: row.email || "",
  createdAt: row.created_at,
  defaultAddress: row.address_id
    ? {
        id: Number(row.address_id),
        province: row.province,
        district: row.district,
        municipalityCity: row.municipality_city,
        wardNumber: row.ward_number,
        streetTole: row.street_tole
      }
    : null
});

export const fetchUserProfileById = async (userId, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.phone,
        u.email,
        u.created_at,
        a.id AS address_id,
        a.province,
        a.district,
        a.municipality_city,
        a.ward_number,
        a.street_tole
      FROM users u
      LEFT JOIN addresses a
        ON a.user_id = u.id
        AND a.is_default = TRUE
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (!rows[0]) {
    return null;
  }

  return mapUserRow(rows[0]);
};

export const mapUserProfileRow = mapUserRow;
