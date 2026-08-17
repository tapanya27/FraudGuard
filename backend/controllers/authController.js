const { signToken } = require("../middleware/auth");
const {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
} = require("../services/userService");
const { createAuditLog } = require("../services/auditService");
const { isValidEmail, normalizeEmail } = require("../utils/validation");

async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword, confirm_password } =
      req.body || {};

    const confirmation =
      confirmPassword !== undefined ? confirmPassword : confirm_password;

    if (confirmation !== undefined && confirmation !== password) {
      const err = new Error("Passwords do not match.");
      err.status = 400;
      throw err;
    }

    if (!email || !isValidEmail(email)) {
      const err = new Error("Please enter a valid email address.");
      err.status = 400;
      throw err;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      const err = new Error("An account with this email already exists.");
      err.status = 409;
      throw err;
    }

    const user = await createUser({
      name: name || String(email).split("@")[0],
      email,
      password,
      role: "ANALYST",
    });

    await createAuditLog({
      userId: user.id,
      action: "USER_REGISTERED",
      resource: "user",
      resourceId: user.id,
      metadata: { role: user.role },
    });

    res.status(201).json({
      success: true,
      message: "Registration successful. Please log in.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      const err = new Error("Email and password are required");
      err.status = 400;
      throw err;
    }

    const row = await findUserByEmail(normalizeEmail(email));

    if (!row || !(await verifyPassword(password, row.password_hash))) {
      await createAuditLog({
        userId: row ? row.id : null,
        action: "LOGIN_FAILED",
        resource: "auth",
        metadata: { email: String(email).trim().toLowerCase() },
      });

      const err = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    if (!row.is_active) {
      const err = new Error("Account is deactivated");
      err.status = 403;
      throw err;
    }

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    await createAuditLog({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      resource: "auth",
    });

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await findUserById(req.user.id);

    if (!user || !user.is_active) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await createAuditLog({
      userId: req.user?.id || null,
      action: "LOGOUT",
      resource: "auth",
    });

    // JWT is stateless — client discards the token
    res.json({
      success: true,
      message: "Logged out",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  logout,
};
