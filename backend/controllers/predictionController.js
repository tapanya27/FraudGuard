const { predictFraud, checkMlHealth } = require("../services/mlService");
const { createTransaction } = require("../services/transactionService");
const { checkDatabaseHealth } = require("../config/db");
const { createAuditLog } = require("../services/auditService");

const EXPECTED_FEATURE_COUNT = 34;

function isNumeric(value) {
  return typeof value === "number" && Number.isFinite(value);
}

async function predict(req, res, next) {
  try {
    const { features } = req.body || {};

    if (features === undefined || features === null) {
      const err = new Error("features is required");
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(features)) {
      const err = new Error("features must be an array");
      err.status = 400;
      throw err;
    }

    if (features.length !== EXPECTED_FEATURE_COUNT) {
      const err = new Error(`Expected ${EXPECTED_FEATURE_COUNT} features`);
      err.status = 400;
      throw err;
    }

    if (!features.every(isNumeric)) {
      const err = new Error("All feature values must be numeric");
      err.status = 400;
      throw err;
    }

    const result = await predictFraud(features);

    const saved = await createTransaction({
      prediction: result.prediction,
      probability: result.probability,
      risk_level: result.risk_level,
      threshold: result.threshold,
      fold_probabilities: result.fold_probabilities,
      features,
      explanation: result.explanation ?? null,
      user_id: req.user?.id || null,
    });

    await createAuditLog({
      userId: req.user?.id || null,
      action: "TRANSACTION_ANALYZED",
      resource: "transaction",
      resourceId: saved.id,
      transactionId: saved.id,
      metadata: {
        prediction: result.prediction,
        risk_level: result.risk_level,
      },
    });

    res.json({
      success: true,
      id: saved.id,
      prediction: result.prediction,
      probability: result.probability,
      risk_level: result.risk_level,
      threshold: result.threshold,
      fold_probabilities: result.fold_probabilities,
      explanation: result.explanation ?? null,
      created_at: saved.created_at,
    });
  } catch (error) {
    next(error);
  }
}

async function health(req, res, next) {
  try {
    const [mlStatus, dbStatus] = await Promise.all([
      checkMlHealth(),
      checkDatabaseHealth(),
    ]);

    const mlOk = mlStatus === "connected";
    const dbOk = dbStatus === "connected";
    const healthy = mlOk && dbOk;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "healthy" : "degraded",
      backend: "running",
      database: dbStatus,
      ml_service: mlStatus,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  predict,
  health,
};
