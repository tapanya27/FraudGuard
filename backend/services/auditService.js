const pool = require("../config/db");

function wrapDbError(error, fallbackMessage) {
  const wrapped = new Error(fallbackMessage);
  wrapped.status = 500;
  return wrapped;
}

async function createAuditLog({
  userId = null,
  action,
  resource = null,
  resourceId = null,
  transactionId = null,
  oldStatus = null,
  newStatus = null,
  notes = null,
  metadata = null,
}) {
  const sql = `
    INSERT INTO audit_logs (
      user_id,
      action,
      resource,
      resource_id,
      metadata,
      transaction_id,
      old_status,
      new_status,
      notes
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
    RETURNING id, user_id, action, resource, resource_id, metadata,
              transaction_id, old_status, new_status, notes, created_at
  `;

  const values = [
    userId,
    action,
    resource,
    resourceId == null ? null : String(resourceId),
    metadata ? JSON.stringify(metadata) : null,
    transactionId,
    oldStatus,
    newStatus,
    notes,
  ];

  try {
    const result = await pool.query(sql, values);
    return result.rows[0];
  } catch (error) {
    console.error("Audit log write failed:", error.message);
    return null;
  }
}

async function getAuditLogs(limit, offset) {
  const countSql = `SELECT COUNT(*)::int AS total FROM audit_logs`;
  const dataSql = `
    SELECT
      a.id,
      a.user_id,
      u.name AS user_name,
      u.email AS user_email,
      a.action,
      a.resource,
      a.resource_id,
      a.metadata,
      a.transaction_id,
      a.old_status,
      a.new_status,
      a.notes,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query(countSql),
      pool.query(dataSql, [limit, offset]),
    ]);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0].total,
    };
  } catch (error) {
    throw wrapDbError(error, "Failed to fetch audit logs");
  }
}

async function getTransactionAudit(transactionId) {
  const sql = `
    SELECT
      a.id,
      a.user_id,
      u.name AS analyst_name,
      u.email AS analyst_email,
      a.action,
      a.old_status,
      a.new_status,
      a.notes,
      a.metadata,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.transaction_id = $1
       OR (a.resource = 'transaction' AND a.resource_id = $2)
       OR (
         a.metadata IS NOT NULL
         AND a.metadata->>'transaction_id' = $2
       )
    ORDER BY a.created_at ASC, a.id ASC
  `;

  try {
    const result = await pool.query(sql, [
      transactionId,
      String(transactionId),
    ]);
    return result.rows;
  } catch (error) {
    throw wrapDbError(error, "Failed to fetch transaction audit trail");
  }
}

module.exports = {
  createAuditLog,
  getAuditLogs,
  getTransactionAudit,
};
