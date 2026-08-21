require("dotenv").config();

const express = require("express");
const cors = require("cors");
const predictionRoutes = require("./routes/predictionRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sampleRoutes = require("./routes/sampleRoutes");
const errorHandler = require("./middleware/errorHandler");
const { checkDatabaseHealth } = require("./config/db");

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set — login will fail until it is configured");
}

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  })
);
app.use(express.json({ limit: "16kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sample-transactions", sampleRoutes);
app.use("/api", predictionRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Node backend running on http://localhost:${PORT}`);
  console.log(`ML service URL: ${process.env.ML_SERVICE_URL}`);
  checkDatabaseHealth().then((status) => {
    console.log(`Database: ${status}`);
  });
});
