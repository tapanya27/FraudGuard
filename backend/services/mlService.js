const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const REQUEST_TIMEOUT_MS = 30000;

if (!ML_SERVICE_URL) {
  throw new Error("ML_SERVICE_URL is not set");
}

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

function wrapMlError(error, fallbackMessage) {
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 502;

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
    wrapped.message =
      typeof detail === "string" ? detail : "ML service returned an error";
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

async function predictFraud(features) {
  try {
    const response = await mlClient.post("/predict", { features });

    if (!isValidPrediction(response.data)) {
      const err = new Error("Invalid response from ML service");
      err.status = 502;
      throw err;
    }

    return response.data;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw wrapMlError(error, "Failed to reach ML service");
  }
}

async function checkMlHealth() {
  try {
    const response = await mlClient.get("/health");
    const healthy =
      response.status === 200 &&
      response.data &&
      response.data.status === "healthy";

    return healthy ? "connected" : "unhealthy";
  } catch (error) {
    return "disconnected";
  }
}

module.exports = {
  predictFraud,
  checkMlHealth,
};
