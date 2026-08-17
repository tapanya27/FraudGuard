const { getAnalytics } = require("../services/analyticsService");
const {
  getInvestigationFeedbackStats,
} = require("../services/investigationService");

async function getAnalyticsDashboard(req, res, next) {
  try {
    const range = req.query.range || "all";
    const [analytics, feedback] = await Promise.all([
      getAnalytics(range),
      getInvestigationFeedbackStats(),
    ]);

    res.json({
      success: true,
      ...analytics,
      investigation_feedback: feedback,
    });
  } catch (error) {
    next(error);
  }
}

async function getFeedbackAnalytics(req, res, next) {
  try {
    const feedback = await getInvestigationFeedbackStats();
    res.json({
      success: true,
      feedback,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnalyticsDashboard,
  getFeedbackAnalytics,
};
