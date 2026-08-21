const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

function resolveSsl() {
  const url = process.env.DATABASE_URL || "";
  const explicit = String(process.env.DATABASE_SSL || "").toLowerCase();

  if (explicit === "false" || explicit === "0") {
    return false;
  }
  if (explicit === "true" || explicit === "1") {
    return { rejectUnauthorized: false };
  }
  if (/sslmode=disable/i.test(url)) {
    return false;
  }
  if (
    process.env.NODE_ENV === "production" ||
    /sslmode=require/i.test(url) ||
    /\.render\.com/i.test(url)
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const ssl = resolveSsl();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

async function checkDatabaseHealth() {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    return result.rows[0] && result.rows[0].ok === 1
      ? "connected"
      : "unhealthy";
  } catch (error) {
    console.error("Database health check failed:", error.message);
    return "disconnected";
  }
}

function wrapDbError(error, fallbackMessage) {
  const message = error?.message || "";
  const code = error?.code;
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 500;
  wrapped.cause = error;
  wrapped.code = code;

  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    /ssl/i.test(message) ||
    /pg_hba\.conf/i.test(message) ||
    /no encryption/i.test(message)
  ) {
    wrapped.status = 503;
    wrapped.message =
      "Unable to reach the database. Check DATABASE_URL and DATABASE_SSL.";
  } else if (code === "42P01") {
    wrapped.message =
      "Database schema is not initialized. Run migrations on this environment.";
  } else if (code === "28P01" || code === "3D000") {
    wrapped.status = 503;
    wrapped.message = "Database authentication or database name is invalid.";
  }

  console.error("Database error:", {
    operation: fallbackMessage,
    code: code || null,
    message: error?.message || String(error),
  });

  return wrapped;
}

module.exports = pool;
module.exports.checkDatabaseHealth = checkDatabaseHealth;
module.exports.wrapDbError = wrapDbError;
module.exports.resolveSsl = resolveSsl;
