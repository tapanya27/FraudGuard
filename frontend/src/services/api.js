import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

function getErrorMessage(error) {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }
  if (error.message === "Network Error") {
    return "Unable to reach the Node backend. Is it running on port 5000?";
  }
  return error.message || "Request failed";
}

async function request(fn) {
  try {
    const response = await fn();
    return response.data;
  } catch (error) {
    const err = new Error(getErrorMessage(error));
    err.status = error.response?.status;
    throw err;
  }
}

export function login(email, password) {
  return request(() => client.post("/api/auth/login", { email, password }));
}

export function register(name, email, password, confirmPassword) {
  return request(() =>
    client.post("/api/auth/register", {
      name,
      email,
      password,
      confirmPassword,
    })
  );
}

export function getMe() {
  return request(() => client.get("/api/auth/me"));
}

export function logout() {
  return request(() => client.post("/api/auth/logout"));
}

export function getHealth() {
  return request(() => client.get("/api/health"));
}

export function getStats() {
  return request(() => client.get("/api/transactions/stats"));
}

export function getAnalytics(range = "all") {
  return request(() =>
    client.get("/api/analytics", {
      params: { range },
    })
  );
}

export function getTransactions(page = 1, limit = 20, filters = {}) {
  return request(() =>
    client.get("/api/transactions", {
      params: {
        page,
        limit,
        ...filters,
      },
    })
  );
}

export function getFraudTransactions(page = 1, limit = 20) {
  return request(() =>
    client.get("/api/transactions/fraud", {
      params: { page, limit },
    })
  );
}

export function getLegitimateTransactions(page = 1, limit = 20) {
  return request(() =>
    client.get("/api/transactions/legitimate", {
      params: { page, limit },
    })
  );
}

export function getTransaction(id) {
  return request(() => client.get(`/api/transactions/${id}`));
}

export function getInvestigation(transactionId) {
  return request(() =>
    client.get(`/api/transactions/${transactionId}/investigation`)
  );
}

export function saveInvestigation(transactionId, payload) {
  return request(() =>
    client.put(`/api/transactions/${transactionId}/investigation`, payload)
  );
}

export function getFeedbackAnalytics() {
  return request(() => client.get("/api/analytics/investigations"));
}

export function getTransactionAudit(transactionId) {
  return request(() => client.get(`/api/transactions/${transactionId}/audit`));
}

export async function downloadInvestigationReport(transactionId) {
  try {
    const response = await client.get(
      `/api/transactions/${transactionId}/report`,
      { responseType: "blob" }
    );
    const contentType = response.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      const text = await response.data.text();
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || parsed.error || "Unable to download report");
    }
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fraudguard-investigation-${transactionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        const err = new Error(parsed.message || parsed.error || "Unable to download report");
        err.status = error.response.status;
        throw err;
      } catch (inner) {
        if (inner.status) throw inner;
      }
    }
    if (error.status) throw error;
    const err = new Error(getErrorMessage(error));
    err.status = error.response?.status;
    throw err;
  }
}

export function predictTransaction(features) {
  return request(() => client.post("/api/predict", { features }));
}

export function getSampleStats() {
  return request(() => client.get("/api/sample-transactions/stats"));
}

export function listSampleTransactions(type = "fraud", limit = 25) {
  return request(() =>
    client.get("/api/sample-transactions", {
      params: { type, limit },
    })
  );
}

export function getSampleTransaction(index) {
  return request(() => client.get(`/api/sample-transactions/${index}`));
}

export function getRandomSampleTransaction(type = "any") {
  return request(() =>
    client.get("/api/sample-transactions/random", {
      params: { type },
    })
  );
}

export function getAdminUsers() {
  return request(() => client.get("/api/admin/users"));
}

export function updateUserRole(id, role) {
  return request(() => client.patch(`/api/admin/users/${id}/role`, { role }));
}

export function updateUserStatus(id, is_active) {
  return request(() =>
    client.patch(`/api/admin/users/${id}/status`, { is_active })
  );
}

export function getAuditLogs(page = 1, limit = 20) {
  return request(() =>
    client.get("/api/admin/audit-logs", {
      params: { page, limit },
    })
  );
}

export function auditModelPerformanceView() {
  return request(() => client.post("/api/audit/model-performance-view"));
}

export { API_URL };
