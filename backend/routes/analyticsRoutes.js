const express = require("express");
const {
  getAnalyticsDashboard,
  getFeedbackAnalytics,
} = require("../controllers/analyticsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/feedback", requireAuth, getFeedbackAnalytics);
router.get("/investigations", requireAuth, getFeedbackAnalytics);
router.get("/", requireAuth, getAnalyticsDashboard);

module.exports = router;
