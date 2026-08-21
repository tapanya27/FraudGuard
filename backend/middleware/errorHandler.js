function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;
  let clientMessage = isServerError
    ? err.message && err.message !== "Internal server error"
      ? err.message
      : "Internal server error"
    : err.message || "Request failed";

  if (err.message === "JWT_SECRET is not set") {
    clientMessage = "Authentication is not configured on the server.";
  }

  if (isServerError) {
    console.error("Request failed", {
      method: req.method,
      path: req.originalUrl,
      status,
      message: err.message,
      code: err.code || err.cause?.code || null,
    });
  }

  const payload = {
    success: false,
    error: clientMessage,
    message: clientMessage,
  };

  if (Array.isArray(err.errors) && err.errors.length > 0) {
    payload.errors = err.errors;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
