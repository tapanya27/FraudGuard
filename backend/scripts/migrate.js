/**
 * Apply idempotent schema.sql without dropping existing data.
 *
 * Usage:
 *   node scripts/migrate.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function main() {
  const sqlPath = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("Schema applied from db/schema.sql (existing data preserved).");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
