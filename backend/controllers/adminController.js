const {
  listUsers,
  updateUserRole,
  setUserActive,
  findUserById,
} = require("../services/userService");
const { getAuditLogs, createAuditLog } = require("../services/auditService");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
}

async function getUsers(req, res, next) {
  try {
    const users = await listUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

async function patchUserRole(req, res, next) {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const { role } = req.body || {};

    if (!Number.isFinite(userId) || userId < 1) {
      const err = new Error("Invalid user id");
      err.status = 400;
      throw err;
    }

    const updated = await updateUserRole(userId, role);

    await createAuditLog({
      userId: req.user.id,
      action: "USER_ROLE_CHANGED",
      resource: "user",
      resourceId: userId,
      metadata: { new_role: updated.role },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function patchUserStatus(req, res, next) {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const { is_active } = req.body || {};

    if (!Number.isFinite(userId) || userId < 1) {
      const err = new Error("Invalid user id");
      err.status = 400;
      throw err;
    }

    if (typeof is_active !== "boolean") {
      const err = new Error("is_active must be a boolean");
      err.status = 400;
      throw err;
    }

    const updated = await setUserActive(userId, is_active);

    await createAuditLog({
      userId: req.user.id,
      action: is_active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      resource: "user",
      resourceId: userId,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await getAuditLogs(limit, offset);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  patchUserRole,
  patchUserStatus,
  listAuditLogs,
  getUser,
};
