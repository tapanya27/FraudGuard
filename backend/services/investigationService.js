const pool = require("../config/db");
const { createAuditLog } = require("./auditService");

const ALLOWED_STATUSES = [
  "UNDER_REVIEW",
  "CONFIRMED_FRAUD",
  "FALSE_POSITIVE",
  "CONFIRMED_LEGITIMATE",
];

function wrapDbError(error, fallbackMessage) {
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 500;
  return wrapped;
}

function normalizeStatus(status) {
  const value = String(status || "").toUpperCase();
  if (!ALLOWED_STATUSES.includes(value)) {
    const err = new Error(
      "status must be UNDER_REVIEW, CONFIRMED_FRAUD, FALSE_POSITIVE, or CONFIRMED_LEGITIMATE"
    );
    err.status = 400;
    throw err;
  }
  return value;
}

async function ensureTransactionExists(transactionId) {
  const result = await pool.query(
    `SELECT id FROM transactions WHERE id = $1`,
    [transactionId]
  );
  if (!result.rows[0]) {
    const err = new Error("Transaction not found");
    err.status = 404;
    throw err;
  }
}

async function getInvestigationByTransactionId(transactionId) {
  const sql = `
    SELECT
      i.id,
      i.transaction_id,
      i.status,
      i.analyst_notes,
      i.created_by AS analyst_id,
      i.created_by,
      i.updated_by,
      i.created_at,
      i.updated_at,
      cu.name AS created_by_name,
      cu.email AS created_by_email,
      uu.name AS updated_by_name,
      uu.email AS updated_by_email
    FROM investigations i
    LEFT JOIN users cu ON cu.id = i.created_by
    LEFT JOIN users uu ON uu.id = i.updated_by
    WHERE i.transaction_id = $1
  `;

  try {
    const result = await pool.query(sql, [transactionId]);
    return result.rows[0] || null;
  } catch (error) {
    throw wrapDbError(error, "Failed to fetch investigation");
  }
}

async function writeInvestigationAudit({
  transactionId,
  investigationId,
  userId,
  existing,
  nextStatus,
  nextNotes,
}) {
  const common = {
    userId,
    resource: "investigation",
    resourceId: investigationId,
    transactionId,
  };

  if (!existing) {
    await createAuditLog({
      ...common,
      action: "INVESTIGATION_OPENED",
      newStatus: nextStatus,
    });

    if (nextStatus !== "UNDER_REVIEW") {
      await createAuditLog({
        ...common,
        action: "STATUS_CHANGED",
        oldStatus: "UNDER_REVIEW",
        newStatus: nextStatus,
      });
    }

    if (nextNotes) {
      await createAuditLog({
        ...common,
        action: "NOTE_ADDED",
        notes: nextNotes,
        newStatus: nextStatus,
      });
    }
    return;
  }

  if (existing.status !== nextStatus) {
    await createAuditLog({
      ...common,
      action: "STATUS_CHANGED",
      oldStatus: existing.status,
      newStatus: nextStatus,
    });
  }

  const prevNotes = existing.analyst_notes || "";
  const newNotes = nextNotes || "";
  if (newNotes && newNotes !== prevNotes) {
    await createAuditLog({
      ...common,
      action: prevNotes ? "INVESTIGATION_UPDATED" : "NOTE_ADDED",
      notes: newNotes,
      oldStatus: existing.status,
      newStatus: nextStatus,
    });
  }
}

async function upsertInvestigation({
  transactionId,
  status,
  analystNotes,
  userId = null,
}) {
  await ensureTransactionExists(transactionId);
  const normalizedStatus = normalizeStatus(status);
  const notes =
    analystNotes === undefined || analystNotes === null
      ? null
      : String(analystNotes);

  const existing = await getInvestigationByTransactionId(transactionId);

  const sql = `
    INSERT INTO investigations (
      transaction_id,
      status,
      analyst_notes,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, $4, $4)
    ON CONFLICT (transaction_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      analyst_notes = EXCLUDED.analyst_notes,
      updated_by = EXCLUDED.updated_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING
      id,
      transaction_id,
      status,
      analyst_notes,
      created_by AS analyst_id,
      created_by,
      updated_by,
      created_at,
      updated_at
  `;

  try {
    const result = await pool.query(sql, [
      transactionId,
      normalizedStatus,
      notes,
      userId,
    ]);

    const saved = result.rows[0];

    await writeInvestigationAudit({
      transactionId,
      investigationId: saved.id,
      userId,
      existing,
      nextStatus: normalizedStatus,
      nextNotes: notes,
    });

    return saved;
  } catch (error) {
    throw wrapDbError(error, "Failed to save investigation");
  }
}

async function getInvestigationFeedbackStats() {
  const countsSql = `
    SELECT
      COUNT(*)::int AS total_investigations,
      COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')::int AS under_review,
      COUNT(*) FILTER (WHERE status = 'CONFIRMED_FRAUD')::int AS confirmed_fraud,
      COUNT(*) FILTER (WHERE status = 'FALSE_POSITIVE')::int AS false_positives,
      COUNT(*) FILTER (WHERE status = 'CONFIRMED_LEGITIMATE')::int AS confirmed_legitimate,
      COUNT(*) FILTER (
        WHERE status IN ('CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'CONFIRMED_LEGITIMATE')
      )::int AS reviewed_transactions
    FROM investigations
  `;

  const comparisonSql = `
    SELECT
      t.prediction,
      i.status,
      COUNT(*)::int AS count
    FROM investigations i
    INNER JOIN transactions t ON t.id = i.transaction_id
    GROUP BY t.prediction, i.status
    ORDER BY t.prediction, i.status
  `;

  try {
    const [countResult, comparisonResult] = await Promise.all([
      pool.query(countsSql),
      pool.query(comparisonSql),
    ]);

    const row = countResult.rows[0];
    const decided =
      Number(row.confirmed_fraud) + Number(row.false_positives);
    const falsePositiveRate =
      decided === 0
        ? 0
        : Number(
            ((Number(row.false_positives) / decided) * 100).toFixed(2)
          );

    const model_vs_analyst = comparisonResult.rows.map((item) => ({
      model_prediction: item.prediction === 1 ? "FRAUD" : "LEGITIMATE",
      analyst_decision: item.status,
      count: item.count,
    }));

    return {
      total_investigations: row.total_investigations,
      under_review: row.under_review,
      confirmed_fraud: row.confirmed_fraud,
      false_positives: row.false_positives,
      confirmed_legitimate: row.confirmed_legitimate,
      reviewed_transactions: row.reviewed_transactions,
      false_positive_rate: falsePositiveRate,
      status_distribution: {
        under_review: row.under_review,
        confirmed_fraud: row.confirmed_fraud,
        false_positives: row.false_positives,
        confirmed_legitimate: row.confirmed_legitimate,
      },
      model_vs_analyst,
      note:
        "Analyst decisions are stored separately from model predictions and are not ground truth labels.",
    };
  } catch (error) {
    throw wrapDbError(error, "Failed to load investigation feedback stats");
  }
}

module.exports = {
  ALLOWED_STATUSES,
  getInvestigationByTransactionId,
  upsertInvestigation,
  getInvestigationFeedbackStats,
};
