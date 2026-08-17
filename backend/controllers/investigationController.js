const {
  getInvestigationByTransactionId,
  upsertInvestigation,
  getInvestigationFeedbackStats,
} = require("../services/investigationService");
const { getTransactionAudit } = require("../services/auditService");
const { buildInvestigationReport } = require("../services/reportService");

async function getInvestigation(req, res, next) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(transactionId) || transactionId < 1) {
      const err = new Error("Invalid transaction id");
      err.status = 400;
      throw err;
    }

    const investigation = await getInvestigationByTransactionId(transactionId);

    if (!investigation) {
      return res.json({
        success: true,
        investigation: null,
      });
    }

    res.json({
      success: true,
      investigation,
    });
  } catch (error) {
    next(error);
  }
}

async function saveInvestigation(req, res, next) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10);
    const { status, analyst_notes } = req.body || {};

    if (!Number.isFinite(transactionId) || transactionId < 1) {
      const err = new Error("Invalid transaction id");
      err.status = 400;
      throw err;
    }

    if (!status) {
      const err = new Error("status is required");
      err.status = 400;
      throw err;
    }

    const investigation = await upsertInvestigation({
      transactionId,
      status,
      analystNotes: analyst_notes,
      userId: req.user?.id || null,
    });

    res.json({
      success: true,
      investigation,
    });
  } catch (error) {
    next(error);
  }
}

async function getTransactionAuditTrail(req, res, next) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(transactionId) || transactionId < 1) {
      const err = new Error("Invalid transaction id");
      err.status = 400;
      throw err;
    }

    const events = await getTransactionAudit(transactionId);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadInvestigationReport(req, res, next) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(transactionId) || transactionId < 1) {
      const err = new Error("Invalid transaction id");
      err.status = 400;
      throw err;
    }

    const pdf = await buildInvestigationReport(transactionId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fraudguard-investigation-${transactionId}.pdf"`
    );
    res.send(pdf);
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
  getInvestigation,
  saveInvestigation,
  getTransactionAuditTrail,
  downloadInvestigationReport,
  getFeedbackAnalytics,
};
