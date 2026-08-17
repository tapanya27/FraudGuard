const express = require("express");
const {
  getUsers,
  patchUserRole,
  patchUserStatus,
  listAuditLogs,
} = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/users", getUsers);
router.patch("/users/:id/role", patchUserRole);
router.patch("/users/:id/status", patchUserStatus);
router.get("/audit-logs", listAuditLogs);

module.exports = router;
