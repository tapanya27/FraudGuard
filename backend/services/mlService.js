const axios = require("axios");

const ML_SERVICE_URL = String(process.env.ML_SERVICE_URL || "").replace(/\/$/, "");
const PREDICT_TIMEOUT_MS = Number(process.env.ML_PREDICT_TIMEOUT_MS) || 90000;
const HEALTH_TIMEOUT_MS = Number(process.env.ML_HEALTH_TIMEOUT_MS) || 4000;
const RETRY_DELAY_MS = 2000;

if (!ML_SERVICE_URL) {
  throw new Error("ML_SERVICE_URL is not set");
}

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: PREDICT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

function mlHost() {
  try {
    return new URL(ML_SERVICE_URL).host;
  } catch {
    return "invalid-ml-url";
  }
}

function debugLog(hypothesisId, location, message, data) {
  // #region agent log
  fetch("http://127.0.0.1:7884/ingest/5d84b9cc-6ff1-43e9-8629-3a9dc08cc17d", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "dd6a37",
    },
    body: JSON.stringify({
      sessionId: "dd6a37",
      runId: "prod-ml",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableMlError(error) {
  const status = error.response?.status;
  const code = error.code;
  if (["ECONNABORTED", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ERR_NETWORK"].includes(code)) {
    return true;
  }
  return status === 502 || status === 503 || status === 504;
}

function wrapMlError(error, fallbackMessage) {
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 502;
  wrapped.code = error.code || null;

  if (error.code === "ECONNABORTED") {
    wrapped.message = "ML service request timed out";
    wrapped.status = 504;
    return wrapped;
  }

  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    wrapped.message = "ML service is unavailable";
    wrapped.status = 503;
    return wrapped;
  }

  if (error.response) {
    const detail = error.response.data && error.response.data.detail;
    const bodyMessage =
      typeof detail === "string"
        ? detail
        : error.response.data && typeof error.response.data.error === "string"
          ? error.response.data.error
          : `ML service returned HTTP ${error.response.status}`;
    wrapped.message = bodyMessage;
    wrapped.status = error.response.status >= 500 ? 502 : error.response.status;
    return wrapped;
  }

  return wrapped;
}

function isValidPrediction(data) {
  return (
    data &&
    typeof data === "object" &&
    typeof data.prediction === "number" &&
    typeof data.probability === "number" &&
    typeof data.risk_level === "string" &&
    typeof data.threshold === "number" &&
    Array.isArray(data.fold_probabilities)
  );
}

async function requestWithRetry(fn, label) {
  try {
    return await fn();
  } catch (error) {
    if (!isRetryableMlError(error)) {
      throw error;
    }
    console.warn("Retrying ML request after transient failure", {
      label,
      host: mlHost(),
      code: error.code || null,
      status: error.response?.status || null,
    });
    debugLog("B", "mlService.js:requestWithRetry", "retrying ML request", {
      label,
      host: mlHost(),
      code: error.code || null,
      status: error.response?.status || null,
    });
    await sleep(RETRY_DELAY_MS);
    return fn();
  }
}

async function predictFraud(features) {
  const payloadKeys = ["features"];
  debugLog("A", "mlService.js:predictFraud", "calling ML /predict", {
    host: mlHost(),
    timeoutMs: PREDICT_TIMEOUT_MS,
    featureCount: Array.isArray(features) ? features.length : null,
    payloadKeys,
  });

  try {
    const response = await requestWithRetry(
      () => mlClient.post("/predict", { features }),
      "predict"
    );

    debugLog("D", "mlService.js:predictFraud", "ML /predict success", {
      host: mlHost(),
      httpStatus: response.status,
      hasExplanation: Boolean(response.data && response.data.explanation),
    });

    if (!isValidPrediction(response.data)) {
      const err = new Error("Invalid response from ML service");
      err.status = 502;
      throw err;
    }

    return response.data;
  } catch (error) {
    debugLog("A", "mlService.js:predictFraud", "ML /predict failed", {
      host: mlHost(),
      code: error.code || null,
      httpStatus: error.response?.status || error.status || null,
      axiosStatusBypass: Boolean(error.isAxiosError && error.status),
      message: error.message,
    });
    console.error("ML predict failed", {
      host: mlHost(),
      code: error.code || null,
      status: error.response?.status || null,
      message: error.message,
    });
    if (error.status && !error.isAxiosError) {
      throw error;
    }
    throw wrapMlError(error, "Failed to reach ML service");
  }
}

async function checkMlHealth() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: HEALTH_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });
    const healthy =
      response.status === 200 &&
      response.data &&
      response.data.status === "healthy";

    debugLog("C", "mlService.js:checkMlHealth", "ML health result", {
      host: mlHost(),
      httpStatus: response.status,
      healthy,
      timeoutMs: HEALTH_TIMEOUT_MS,
    });

    return healthy ? "online" : "offline";
  } catch (error) {
    debugLog("C", "mlService.js:checkMlHealth", "ML health failed", {
      host: mlHost(),
      code: error.code || null,
      httpStatus: error.response?.status || null,
      message: error.message,
      timeoutMs: HEALTH_TIMEOUT_MS,
    });
    console.warn("ML health check failed", {
      host: mlHost(),
      code: error.code || null,
      status: error.response?.status || null,
    });
    return "offline";
  }
}

module.exports = {
  predictFraud,
  checkMlHealth,
};
