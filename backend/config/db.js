const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
    return "disconnected";
  }
}

module.exports = pool;
module.exports.checkDatabaseHealth = checkDatabaseHealth;
