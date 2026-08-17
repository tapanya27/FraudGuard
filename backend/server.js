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

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set");
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
});
