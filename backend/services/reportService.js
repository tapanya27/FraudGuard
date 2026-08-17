const PDFDocument = require("pdfkit");
const { getTransactionById } = require("./transactionService");
const { getInvestigationByTransactionId } = require("./investigationService");
const { getTransactionAudit } = require("./auditService");

const FEATURE_NAMES = [
  "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
  "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20",
  "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28",
  "Amount", "Hour", "is_night", "log_amount", "amount_to_mean", "is_high_amount",
];

const INTERPRETABLE = [
  "Amount",
  "Hour",
  "is_night",
  "log_amount",
  "amount_to_mean",
  "is_high_amount",
];

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${(Number(value) * 100).toFixed(3)}%`;
}

function fmtDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function shapLabel(name) {
  if (/^V\d+$/.test(name)) {
    return `Model Feature ${name}`;
  }
  return name;
}

function predictionLabel(prediction) {
  return Number(prediction) === 1 ? "FRAUD" : "LEGITIMATE";
}

function featureValue(features, name) {
  const index = FEATURE_NAMES.indexOf(name);
  if (index < 0 || !Array.isArray(features)) return "—";
  const value = features[index];
  if (value === null || value === undefined) return "—";
  return String(value);
}

function sectionTitle(doc, title) {
  doc.moveDown(0.6);
  doc.fontSize(12).fillColor("#0b1224").font("Helvetica-Bold").text(title);
  doc.moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor("#3b82f6")
    .stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica").fillColor("#111827").fontSize(10);
}

function kv(doc, label, value) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(String(value ?? "—"));
}

async function buildInvestigationReport(transactionId) {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) {
    const err = new Error("Transaction not found");
    err.status = 404;
    throw err;
  }

  const investigation = await getInvestigationByTransactionId(transactionId);
  const audit = await getTransactionAudit(transactionId);
  const features = Array.isArray(transaction.features)
    ? transaction.features
    : [];
  const folds = Array.isArray(transaction.fold_probabilities)
    ? transaction.fold_probabilities
    : [];
  const explanation = transaction.explanation || {};

  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: `FraudGuard Investigation Report #${transactionId}`,
      Author: "FraudGuard",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  doc.rect(0, 0, doc.page.width, 72).fill("#0b1224");
  doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold")
    .text("FRAUDGUARD", 48, 22);
  doc.fontSize(10).font("Helvetica")
    .text("Transaction Investigation Report", 48, 44);

  doc.fillColor("#111827");
  doc.y = 96;

  sectionTitle(doc, "Transaction Information");
  kv(doc, "Transaction ID", `#${transaction.id}`);
  kv(doc, "Created At", fmtDate(transaction.created_at));
  INTERPRETABLE.forEach((name) => {
    kv(doc, name, featureValue(features, name));
  });

  sectionTitle(doc, "Model Result");
  kv(doc, "Prediction", predictionLabel(transaction.prediction));
  kv(doc, "Fraud Probability", fmtPct(transaction.probability));
  kv(doc, "Risk Level", transaction.risk_level);
  kv(doc, "Threshold", fmtPct(transaction.threshold));

  sectionTitle(doc, "Model Ensemble");
  folds.forEach((fold, index) => {
    kv(doc, `Fold ${index + 1} probability`, fmtPct(fold));
  });
  if (folds.length === 0) {
    doc.text("No fold probabilities stored.");
  }

  sectionTitle(doc, "Why was this transaction flagged?");
  const positive = Array.isArray(explanation.top_positive)
    ? explanation.top_positive
    : [];
  const negative = Array.isArray(explanation.top_negative)
    ? explanation.top_negative
    : [];

  doc.font("Helvetica-Bold").text("Top SHAP factors increasing risk");
  doc.font("Helvetica");
  if (positive.length === 0) {
    doc.text("Unavailable for this record (explanation was not stored).");
  } else {
    positive.forEach((item) => {
      doc.text(
        `${shapLabel(item.feature)}    +${Number(item.shap_value).toFixed(4)}`
      );
    });
  }

  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").text("Top SHAP factors reducing risk");
  doc.font("Helvetica");
  if (negative.length === 0) {
    doc.text("Unavailable for this record (explanation was not stored).");
  } else {
    negative.forEach((item) => {
      doc.text(
        `${shapLabel(item.feature)}    ${Number(item.shap_value).toFixed(4)}`
      );
    });
  }

  sectionTitle(doc, "Analyst Investigation");
  if (!investigation) {
    doc.text("No analyst investigation has been saved for this transaction.");
  } else {
    kv(doc, "Analyst Name", investigation.updated_by_name || investigation.created_by_name || "—");
    kv(doc, "Analyst Email", investigation.updated_by_email || investigation.created_by_email || "—");
    kv(doc, "Investigation Status", investigation.status);
    kv(doc, "Analyst Notes", investigation.analyst_notes || "—");
    kv(doc, "Investigation Created At", fmtDate(investigation.created_at));
    kv(doc, "Last Updated At", fmtDate(investigation.updated_at));
  }

  sectionTitle(doc, "Audit Trail");
  if (!audit.length) {
    doc.text("No audit events recorded.");
  } else {
    audit.forEach((event) => {
      doc.font("Helvetica-Bold").text(String(event.action).replace(/_/g, " "));
      doc.font("Helvetica");
      if (event.old_status || event.new_status) {
        doc.text(`${event.old_status || "—"} → ${event.new_status || "—"}`);
      }
      if (event.notes) {
        doc.text(`Notes: ${event.notes}`);
      }
      doc.text(
        `${event.analyst_name || "System"} · ${fmtDate(event.created_at)}`
      );
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(1.2);
  doc.fontSize(9).fillColor("#64748b")
    .text("Report generated by FraudGuard", { align: "center" });
  doc.text(fmtDate(new Date()), { align: "center" });

  doc.end();

  const buffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return buffer;
}

module.exports = {
  buildInvestigationReport,
};
