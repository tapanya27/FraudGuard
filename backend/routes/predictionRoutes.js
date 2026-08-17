const express = require("express");
const {
  predict,
  health,
} = require("../controllers/predictionController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Health is available to any authenticated user (Model Performance is ADMIN-only in UI)
router.get("/health", requireAuth, health);
router.post("/predict", requireAuth, predict);

// Optional: mark model performance view for audit when ADMIN hits this lightweight endpoint
router.post(
  "/audit/model-performance-view",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { createAuditLog } = require("../services/auditService");
      await createAuditLog({
        userId: req.user.id,
        action: "MODEL_PERFORMANCE_VIEWED",
        resource: "model_performance",
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
