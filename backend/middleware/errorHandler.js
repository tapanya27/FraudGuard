function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message =
    status === 500
      ? "Internal server error"
      : err.message || "Request failed";

  const payload = {
    success: false,
    error: message,
    message,
  };

  if (Array.isArray(err.errors) && err.errors.length > 0) {
    payload.errors = err.errors;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
