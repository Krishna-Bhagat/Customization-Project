import { pool } from "../db/pool.js";
import {
  comparePassword,
  hashPassword,
  isValidEmail,
  normalizeOptionalEmail,
  normalizePhoneNumber,
  signUserToken,
  validatePhoneNumber
} from "../utils/auth.js";
import { fetchUserProfileById } from "../utils/userProfile.js";

const toTrimmed = (value) => String(value || "").trim();

const validateRequiredAddress = (payload) => {
  const province = toTrimmed(payload?.province);
  const district = toTrimmed(payload?.district);
  const municipalityCity = toTrimmed(payload?.municipalityCity);
  const wardNumber = toTrimmed(payload?.wardNumber);
  const streetTole = toTrimmed(payload?.streetTole);

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

const ensureUniqueUser = async ({ phone, email, ignoreUserId = null, client = pool }) => {
  const phoneQuery = await client.query(
    "SELECT id FROM users WHERE phone = $1 AND ($2::INT IS NULL OR id <> $2::INT) LIMIT 1",
    [phone, ignoreUserId]
  );
  if (phoneQuery.rows[0]) {
    return { field: "phone", message: "Phone number is already registered." };
  }

  if (email) {
    const emailQuery = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND ($2::INT IS NULL OR id <> $2::INT) LIMIT 1",
      [email, ignoreUserId]
    );
    if (emailQuery.rows[0]) {
      return { field: "email", message: "Email is already registered." };
    }
  }

  return null;
};

export const registerUser = async (req, res, next) => {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const fullName = toTrimmed(req.body.fullName);
    const phone = normalizePhoneNumber(req.body.phone);
    const password = String(req.body.password || "");
    const email = normalizeOptionalEmail(req.body.email);
    const address = validateRequiredAddress(req.body);

    if (!fullName || !phone || !password || !address) {
      return res.status(400).json({
        message:
          "Full name, phone, password, province, district, municipality/city, ward number, and street/tole are required."
      });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        message: "Phone number must be exactly 10 digits."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        message: "Email format is invalid."
      });
    }

    const duplicate = await ensureUniqueUser({ phone, email, client });
    if (duplicate) {
      return res.status(409).json({ message: duplicate.message });
    }

    const passwordHash = await hashPassword(password);

    await client.query("BEGIN");
    inTransaction = true;

    const userResult = await client.query(
      `
        INSERT INTO users (
          full_name,
          phone,
          email,
          password_hash
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [fullName, phone, email || null, passwordHash]
    );

    const userId = Number(userResult.rows[0].id);

    await client.query(
      `
        INSERT INTO addresses (
          user_id,
          province,
          district,
          municipality_city,
          ward_number,
          street_tole,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      `,
      [
        userId,
        address.province,
        address.district,
        address.municipalityCity,
        address.wardNumber,
        address.streetTole
      ]
    );

    await client.query("COMMIT");
    inTransaction = false;

    const token = signUserToken({ userId, phone });
    const user = await fetchUserProfileById(userId);

    return res.status(201).json({
      token,
      user
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

export const loginUser = async (req, res, next) => {
  try {
    const phone = normalizePhoneNumber(req.body.phone);
    const password = String(req.body.password || "");

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone number and password are required."
      });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        message: "Phone number must be exactly 10 digits."
      });
    }

    const { rows } = await pool.query(
      "SELECT id, phone, password_hash FROM users WHERE phone = $1 LIMIT 1",
      [phone]
    );

    const userRow = rows[0];
    if (!userRow) {
      return res.status(404).json({
        message: "Account not found. Please sign up."
      });
    }

    const matches = await comparePassword(password, userRow.password_hash);
    if (!matches) {
      return res.status(401).json({
        message: "Incorrect password."
      });
    }

    const userId = Number(userRow.id);
    const token = signUserToken({ userId, phone: userRow.phone });
    const user = await fetchUserProfileById(userId);

    return res.status(200).json({
      token,
      user
    });
  } catch (error) {
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const phoneOrEmail = toTrimmed(req.body.phoneOrEmail).toLowerCase();
    const newPassword = String(req.body.newPassword || "");

    if (!phoneOrEmail || !newPassword) {
      return res.status(400).json({
        message: "Phone/email and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    let userQuery;
    if (validatePhoneNumber(phoneOrEmail)) {
      userQuery = await pool.query("SELECT id FROM users WHERE phone = $1 LIMIT 1", [phoneOrEmail]);
    } else if (isValidEmail(phoneOrEmail)) {
      userQuery = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [phoneOrEmail]
      );
    } else {
      return res.status(400).json({
        message: "Enter a valid 10-digit phone number or email."
      });
    }

    const userId = Number(userQuery.rows?.[0]?.id || 0);
    if (!userId) {
      return res.status(404).json({
        message: "Account not found. Please sign up."
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
      passwordHash,
      userId
    ]);

    return res.status(200).json({
      message: "Password reset successful."
    });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await fetchUserProfileById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const userId = req.user.id;
    const current = await fetchUserProfileById(userId, client);
    if (!current) {
      return res.status(404).json({ message: "User not found." });
    }

    const incomingEmail = req.body.email;
    const incomingFullName = req.body.fullName;

    const nextEmail =
      incomingEmail === undefined ? current.email : normalizeOptionalEmail(incomingEmail);
    const nextFullName =
      incomingFullName === undefined ? current.fullName : toTrimmed(incomingFullName);

    if (!nextFullName) {
      return res.status(400).json({ message: "Full name is required." });
    }

    if (nextEmail && !isValidEmail(nextEmail)) {
      return res.status(400).json({ message: "Email format is invalid." });
    }

    const duplicate = await ensureUniqueUser({
      phone: current.phone,
      email: nextEmail,
      ignoreUserId: userId,
      client
    });
    if (duplicate && duplicate.field === "email") {
      return res.status(409).json({ message: duplicate.message });
    }

    const currentAddress = current.defaultAddress || {};
    const nextAddress = {
      province:
        req.body.province === undefined ? currentAddress.province : toTrimmed(req.body.province),
      district:
        req.body.district === undefined ? currentAddress.district : toTrimmed(req.body.district),
      municipalityCity:
        req.body.municipalityCity === undefined
          ? currentAddress.municipalityCity
          : toTrimmed(req.body.municipalityCity),
      wardNumber:
        req.body.wardNumber === undefined ? currentAddress.wardNumber : toTrimmed(req.body.wardNumber),
      streetTole:
        req.body.streetTole === undefined ? currentAddress.streetTole : toTrimmed(req.body.streetTole)
    };

    if (
      !nextAddress.province ||
      !nextAddress.district ||
      !nextAddress.municipalityCity ||
      !nextAddress.wardNumber ||
      !nextAddress.streetTole
    ) {
      return res.status(400).json({
        message:
          "Province, district, municipality/city, ward number, and street/tole are required in address."
      });
    }

    await client.query("BEGIN");
    inTransaction = true;

    await client.query(
      "UPDATE users SET full_name = $1, email = $2, updated_at = NOW() WHERE id = $3",
      [nextFullName, nextEmail || null, userId]
    );

    if (current.defaultAddress?.id) {
      await client.query(
        `
          UPDATE addresses
          SET
            province = $1,
            district = $2,
            municipality_city = $3,
            ward_number = $4,
            street_tole = $5,
            updated_at = NOW()
          WHERE id = $6
        `,
        [
          nextAddress.province,
          nextAddress.district,
          nextAddress.municipalityCity,
          nextAddress.wardNumber,
          nextAddress.streetTole,
          current.defaultAddress.id
        ]
      );
    } else {
      await client.query(
        `
          INSERT INTO addresses (
            user_id,
            province,
            district,
            municipality_city,
            ward_number,
            street_tole,
            is_default
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        `,
        [
          userId,
          nextAddress.province,
          nextAddress.district,
          nextAddress.municipalityCity,
          nextAddress.wardNumber,
          nextAddress.streetTole
        ]
      );
    }

    await client.query("COMMIT");
    inTransaction = false;

    const user = await fetchUserProfileById(userId);
    return res.status(200).json({
      message: "Profile updated successfully.",
      user
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

export const updateUserPassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1 LIMIT 1", [
      req.user.id
    ]);
    if (!rows[0]) {
      return res.status(404).json({ message: "User not found." });
    }

    const matches = await comparePassword(currentPassword, rows[0].password_hash);
    if (!matches) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const nextHash = await hashPassword(newPassword);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
      nextHash,
      req.user.id
    ]);

    return res.status(200).json({
      message: "Password updated successfully."
    });
  } catch (error) {
    return next(error);
  }
};
