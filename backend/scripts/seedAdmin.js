/**
 * Seed an initial ADMIN user.
 *
 * Usage:
 *   node scripts/seedAdmin.js
 *
 * Optional env overrides:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const {
  createUser,
  findUserByEmail,
} = require("../services/userService");

async function main() {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = process.env.ADMIN_EMAIL || "admin@fraudguard.local";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";

  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`Admin already exists: ${email} (id=${existing.id}, role=${existing.role})`);
  } else {
    const user = await createUser({
      name,
      email,
      password,
      role: "ADMIN",
    });

    console.log("Created ADMIN user:");
    console.log(`  email: ${user.email}`);
    console.log(`  password: ${password}`);
    console.log(`  role: ${user.role}`);
  }

  const analystEmail = process.env.ANALYST_EMAIL || "analyst@fraudguard.local";
  const analystPassword = process.env.ANALYST_PASSWORD || "Analyst123!";
  const existingAnalyst = await findUserByEmail(analystEmail);
  if (!existingAnalyst) {
    const analyst = await createUser({
      name: process.env.ANALYST_NAME || "Analyst One",
      email: analystEmail,
      password: analystPassword,
      role: "ANALYST",
    });
    console.log("Created ANALYST user:");
    console.log(`  email: ${analyst.email}`);
    console.log(`  password: ${analystPassword}`);
    console.log(`  role: ${analyst.role}`);
  } else {
    console.log(`Analyst already exists: ${analystEmail}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
