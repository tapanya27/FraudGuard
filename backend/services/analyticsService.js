const pool = require("../config/db");

function wrapDbError(error, fallbackMessage) {
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 500;
  return wrapped;
}

const RANGE_OPTIONS = {
  all: null,
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

function resolveRange(range) {
  const key = String(range || "all").toLowerCase();
  if (!(key in RANGE_OPTIONS)) {
    const err = new Error("Invalid range. Use all, 24h, 7d, or 30d");
    err.status = 400;
    throw err;
  }
  return { key, interval: RANGE_OPTIONS[key] };
}

function buildTimeFilter(interval, paramIndex = 1) {
  if (!interval) {
    return { clause: "", params: [] };
  }
  return {
    clause: `WHERE created_at >= NOW() - INTERVAL '${interval}'`,
    // interval is from a fixed allowlist, never user-concatenated freely
    params: [],
  };
}

async function getAnalytics(range = "all") {
  const { key, interval } = resolveRange(range);
  const { clause } = buildTimeFilter(interval);

  const summarySql = `
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
    ${clause}
  `;

  const riskSql = `
    SELECT
      COUNT(*) FILTER (WHERE risk_level = 'LOW')::int AS low,
      COUNT(*) FILTER (WHERE risk_level = 'MEDIUM')::int AS medium,
      COUNT(*) FILTER (WHERE risk_level = 'HIGH')::int AS high
    FROM transactions
    ${clause}
  `;

  const probabilitySql = `
    SELECT
      COUNT(*) FILTER (WHERE probability >= 0 AND probability < 0.2)::int AS b0,
      COUNT(*) FILTER (WHERE probability >= 0.2 AND probability < 0.4)::int AS b1,
      COUNT(*) FILTER (WHERE probability >= 0.4 AND probability < 0.6)::int AS b2,
      COUNT(*) FILTER (WHERE probability >= 0.6 AND probability < 0.8)::int AS b3,
      COUNT(*) FILTER (WHERE probability >= 0.8 AND probability <= 1)::int AS b4
    FROM transactions
    ${clause}
  `;

  // Hourly buckets for 24h; daily for longer ranges
  const truncUnit = key === "24h" ? "hour" : "day";
  const timeSeriesSql = `
    SELECT
      to_char(DATE_TRUNC('${truncUnit}', created_at), 
        CASE WHEN '${truncUnit}' = 'hour' THEN 'YYYY-MM-DD HH24:00'
             ELSE 'YYYY-MM-DD' END
      ) AS date,
      COUNT(*)::int AS transactions,
      COUNT(*) FILTER (WHERE prediction = 1)::int AS fraud
    FROM transactions
    ${clause}
    GROUP BY DATE_TRUNC('${truncUnit}', created_at)
    ORDER BY DATE_TRUNC('${truncUnit}', created_at) ASC
  `;

  const recentHighRiskSql = `
    SELECT
      t.id,
      t.prediction,
      t.probability,
      t.risk_level,
      t.threshold,
      t.created_at,
      i.status AS investigation_status
    FROM transactions t
    LEFT JOIN investigations i ON i.transaction_id = t.id
    ${clause ? `${clause.replace("created_at", "t.created_at")} AND t.risk_level = 'HIGH'` : `WHERE t.risk_level = 'HIGH'`}
    ORDER BY t.created_at DESC
    LIMIT 10
  `;

  try {
    const [summaryRes, riskRes, probRes, timeRes, recentRes] =
      await Promise.all([
        pool.query(summarySql),
        pool.query(riskSql),
        pool.query(probabilitySql),
        pool.query(timeSeriesSql),
        pool.query(recentHighRiskSql),
      ]);

    const summary = summaryRes.rows[0];
    const risk = riskRes.rows[0];
    const prob = probRes.rows[0];

    return {
      range: key,
      summary: {
        total_transactions: summary.total_transactions,
        fraud_transactions: summary.fraud_transactions,
        legitimate_transactions: summary.legitimate_transactions,
        fraud_rate: summary.fraud_rate,
        high_risk_transactions: summary.high_risk_transactions,
        average_probability: summary.average_probability,
      },
      prediction_distribution: {
        fraud: summary.fraud_transactions,
        legitimate: summary.legitimate_transactions,
      },
      risk_distribution: {
        low: risk.low,
        medium: risk.medium,
        high: risk.high,
      },
      probability_distribution: [
        { range: "0-20%", count: prob.b0 },
        { range: "20-40%", count: prob.b1 },
        { range: "40-60%", count: prob.b2 },
        { range: "60-80%", count: prob.b3 },
        { range: "80-100%", count: prob.b4 },
      ],
      time_series: timeRes.rows.map((row) => ({
        date: row.date,
        transactions: row.transactions,
        fraud: row.fraud,
      })),
      recent_high_risk: recentRes.rows,
    };
  } catch (error) {
    throw wrapDbError(error, "Failed to load analytics");
  }
}

module.exports = {
  getAnalytics,
};
