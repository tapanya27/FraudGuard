const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { wrapDbError } = pool;
const {
  isValidEmail,
  normalizeEmail,
  getPasswordValidationMessages,
} = require("../utils/validation");

const SALT_ROUNDS = 10;
const ALLOWED_ROLES = ["ADMIN", "ANALYST"];

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createUser({ name, email, password, role = "ANALYST" }) {
  if (!name || !String(name).trim()) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }

  if (!email || !String(email).trim()) {
    const err = new Error("Please enter a valid email address.");
    err.status = 400;
    throw err;
  }

  if (!isValidEmail(email)) {
    const err = new Error("Please enter a valid email address.");
    err.status = 400;
    throw err;
  }

  const passwordErrors = getPasswordValidationMessages(password);
  if (passwordErrors.length > 0) {
    const err = new Error(passwordErrors[0]);
    err.status = 400;
    err.errors = passwordErrors;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);

  const normalizedRole = String(role || "ANALYST").toUpperCase();
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    const err = new Error("Role must be ADMIN or ANALYST");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const sql = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, is_active, created_at, updated_at
  `;

  try {
    const result = await pool.query(sql, [
      String(name).trim(),
      normalizedEmail,
      passwordHash,
      normalizedRole,
    ]);
    return sanitizeUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const err = new Error("An account with this email already exists.");
      err.status = 409;
      throw err;
    }
    throw wrapDbError(error, "Failed to create user");
  }
}

async function findUserByEmail(email) {
  const sql = `
    SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
    FROM users
    WHERE email = $1
  `;

  try {
    const result = await pool.query(sql, [normalizeEmail(email)]);
    return result.rows[0] || null;
  } catch (error) {
    throw wrapDbError(error, "Failed to lookup user");
  }
}

async function findUserById(id) {
  const sql = `
    SELECT id, name, email, role, is_active, created_at, updated_at
    FROM users
    WHERE id = $1
  `;

  try {
    const result = await pool.query(sql, [id]);
    return sanitizeUser(result.rows[0]);
  } catch (error) {
    throw wrapDbError(error, "Failed to lookup user");
  }
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

async function listUsers() {
  const sql = `
    SELECT id, name, email, role, is_active, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(sql);
    return result.rows.map(sanitizeUser);
  } catch (error) {
    throw wrapDbError(error, "Failed to list users");
  }
}

async function countActiveAdmins() {
  const sql = `
    SELECT COUNT(*)::int AS total
    FROM users
    WHERE role = 'ADMIN' AND is_active = TRUE
  `;

  try {
    const result = await pool.query(sql);
    return result.rows[0].total;
  } catch (error) {
    throw wrapDbError(error, "Failed to count admins");
  }
}

async function updateUserRole(userId, role) {
  const normalizedRole = String(role || "").toUpperCase();
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    const err = new Error("Role must be ADMIN or ANALYST");
    err.status = 400;
    throw err;
  }

  const existing = await findUserById(userId);
  if (!existing) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (existing.role === "ADMIN" && normalizedRole !== "ADMIN") {
    const adminCount = await countActiveAdmins();
    if (adminCount <= 1 && existing.is_active) {
      const err = new Error("Cannot demote the last active ADMIN");
      err.status = 400;
      throw err;
    }
  }

  const sql = `
    UPDATE users
    SET role = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, name, email, role, is_active, created_at, updated_at
  `;

  try {
    const result = await pool.query(sql, [normalizedRole, userId]);
    return sanitizeUser(result.rows[0]);
  } catch (error) {
    throw wrapDbError(error, "Failed to update user role");
  }
}

async function setUserActive(userId, isActive) {
  const existing = await findUserById(userId);
  if (!existing) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (existing.role === "ADMIN" && existing.is_active && isActive === false) {
    const adminCount = await countActiveAdmins();
    if (adminCount <= 1) {
      const err = new Error("Cannot deactivate the last active ADMIN");
      err.status = 400;
      throw err;
    }
  }

  const sql = `
    UPDATE users
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, name, email, role, is_active, created_at, updated_at
  `;

  try {
    const result = await pool.query(sql, [Boolean(isActive), userId]);
    return sanitizeUser(result.rows[0]);
  } catch (error) {
    throw wrapDbError(error, "Failed to update user status");
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  listUsers,
  updateUserRole,
  setUserActive,
  sanitizeUser,
  ALLOWED_ROLES,
};
