const express = require("express");
const {
  listSampleTransactions,
  getSampleTransaction,
  getRandomSampleTransaction,
  getSampleStats,
} = require("../controllers/sampleController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/stats", getSampleStats);
router.get("/random", getRandomSampleTransaction);
router.get("/", listSampleTransactions);
router.get("/:index", getSampleTransaction);

module.exports = router;
