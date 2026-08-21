const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT_SECRET is not set");
    err.status = 500;
    throw err;
  }
  return secret;
}

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }

    const payload = jwt.verify(token, getJwtSecret());

    if (!payload || !payload.id || !payload.role) {
      const err = new Error("Invalid token");
      err.status = 401;
      throw err;
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      const err = new Error("Invalid or expired token");
      err.status = 401;
      return next(err);
    }
    if (!error.status) {
      error.status = 401;
      error.message = error.message || "Authentication required";
    }
    next(error);
  }
}

function requireRole(...roles) {
  const allowed = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      const err = new Error("Authentication required");
      err.status = 401;
      return next(err);
    }

    if (!allowed.includes(req.user.role)) {
      const err = new Error("Insufficient permissions");
      err.status = 403;
      return next(err);
    }

    next();
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

module.exports = {
  requireAuth,
  requireRole,
  signToken,
  getJwtSecret,
};
