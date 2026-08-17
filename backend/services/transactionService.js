const pool = require("../config/db");

function wrapDbError(error, fallbackMessage) {
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 500;
  return wrapped;
}

const SELECT_WITH_INVESTIGATION = `
  SELECT
    t.id,
    t.prediction,
    t.probability,
    t.risk_level,
    t.threshold,
    t.fold_probabilities,
    t.features,
    t.user_id,
    t.created_at,
    t.explanation,
    i.id AS investigation_id,
    i.status AS investigation_status,
    i.analyst_notes AS investigation_notes,
    i.updated_at AS investigation_updated_at
  FROM transactions t
  LEFT JOIN investigations i ON i.transaction_id = t.id
`;

async function createTransaction(data) {
  const {
    prediction,
    probability,
    risk_level,
    threshold,
    fold_probabilities,
    features,
    explanation = null,
    user_id = null,
  } = data;

  const sql = `
    INSERT INTO transactions (
      prediction,
      probability,
      risk_level,
      threshold,
      fold_probabilities,
      features,
      explanation,
      user_id
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
    RETURNING *
  `;

  const values = [
    prediction,
    probability,
    risk_level,
    threshold,
    JSON.stringify(fold_probabilities),
    JSON.stringify(features),
    explanation ? JSON.stringify(explanation) : null,
    user_id,
  ];

  try {
    const result = await pool.query(sql, values);
    return result.rows[0];
  } catch (error) {
    throw wrapDbError(error, "Failed to save transaction");
  }
}

function buildListQuery(filters = {}) {
  const where = [];
  const params = [];

  if (filters.prediction === 0 || filters.prediction === 1) {
    params.push(filters.prediction);
    where.push(`t.prediction = $${params.length}`);
  }

  if (filters.risk_level) {
    const risk = String(filters.risk_level).toUpperCase();
    if (["LOW", "MEDIUM", "HIGH"].includes(risk)) {
      params.push(risk);
      where.push(`t.risk_level = $${params.length}`);
    }
  }

  if (filters.id) {
    const id = Number.parseInt(filters.id, 10);
    if (Number.isFinite(id) && id > 0) {
      params.push(id);
      where.push(`t.id = $${params.length}`);
    }
  }

  if (filters.investigation_status) {
    const status = String(filters.investigation_status).toUpperCase();
    if (
      ["UNDER_REVIEW", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "CONFIRMED_LEGITIMATE"].includes(status)
    ) {
      params.push(status);
      where.push(`i.status = $${params.length}`);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let orderSql = "ORDER BY t.created_at DESC";
  const sort = String(filters.sort || "newest").toLowerCase();
  if (sort === "oldest") {
    orderSql = "ORDER BY t.created_at ASC";
  } else if (sort === "probability_desc") {
    orderSql = "ORDER BY t.probability DESC, t.created_at DESC";
  } else if (sort === "probability_asc") {
    orderSql = "ORDER BY t.probability ASC, t.created_at DESC";
  }

  return { whereSql, orderSql, params };
}

async function queryTransactions(limit, offset, filters = {}) {
  const { whereSql, orderSql, params } = buildListQuery(filters);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM transactions t
    LEFT JOIN investigations i ON i.transaction_id = t.id
    ${whereSql}
  `;

  const dataParams = [...params, limit, offset];
  const dataSql = `
    ${SELECT_WITH_INVESTIGATION}
    ${whereSql}
    ${orderSql}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query(countSql, params),
      pool.query(dataSql, dataParams),
    ]);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0].total,
    };
  } catch (error) {
    throw wrapDbError(error, "Failed to fetch transactions");
  }
}

async function getTransactions(limit, offset) {
  return queryTransactions(limit, offset, {});
}

async function getTransactionById(id) {
  const sql = `
    ${SELECT_WITH_INVESTIGATION}
    WHERE t.id = $1
  `;

  try {
    const result = await pool.query(sql, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw wrapDbError(error, "Failed to fetch transaction");
  }
}

async function getFraudTransactions(limit, offset) {
  return queryTransactions(limit, offset, { prediction: 1 });
}

async function getLegitimateTransactions(limit, offset) {
  return queryTransactions(limit, offset, { prediction: 0 });
}

async function getTransactionStats() {
  const sql = `
    SELECT
      COUNT(*)::int AS total_transactions,
      COUNT(*) FILTER (WHERE prediction = 1)::int AS fraud_transactions,
      COUNT(*) FILTER (WHERE prediction = 0)::int AS legitimate_transactions,
      COUNT(*) FILTER (WHERE risk_level = 'HIGH')::int AS high_risk_transactions,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE prediction = 1)::numeric / COUNT(*)::numeric) * 100,
          2
        )::float
      END AS fraud_rate,
      COALESCE(ROUND(AVG(probability)::numeric, 6), 0)::float AS average_probability
    FROM transactions
  `;

  try {
    const result = await pool.query(sql);
    return result.rows[0];
  } catch (error) {
    throw wrapDbError(error, "Failed to fetch transaction stats");
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  queryTransactions,
  getTransactionById,
  getFraudTransactions,
  getLegitimateTransactions,
  getTransactionStats,
};
