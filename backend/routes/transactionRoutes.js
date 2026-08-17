const express = require("express");
const {
  listTransactions,
  getTransaction,
  listFraudTransactions,
  listLegitimateTransactions,
  getStats,
  getInvestigation,
  saveInvestigation,
} = require("../controllers/transactionController");
const {
  getTransactionAuditTrail,
  downloadInvestigationReport,
} = require("../controllers/investigationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/fraud", listFraudTransactions);
router.get("/legitimate", listLegitimateTransactions);
router.get("/stats", getStats);
router.get("/", listTransactions);
router.get("/:id/investigation", getInvestigation);
router.put("/:id/investigation", saveInvestigation);
router.post("/:id/investigation", saveInvestigation);
router.get("/:id/audit", getTransactionAuditTrail);
router.get("/:id/report", downloadInvestigationReport);
router.get("/:id", getTransaction);

module.exports = router;
