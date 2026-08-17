import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RiskBadge, { PredictionBadge } from "../components/RiskBadge";
import InvestigationStatusBadge from "../components/InvestigationStatusBadge";
import InvestigationPanel from "../components/InvestigationPanel";
import AuditTrail from "../components/AuditTrail";
import {
  downloadInvestigationReport,
  getTransaction,
  getTransactionAudit,
} from "../services/api";
import {
  formatDate,
  formatPercent,
  formatProbability,
  predictionLabel,
} from "../utils/format";

const FEATURE_NAMES = [
  "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
  "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20",
  "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28",
  "Amount", "Hour", "is_night", "log_amount", "amount_to_mean", "is_high_amount",
];

function TransactionDetails() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [investigateOpen, setInvestigateOpen] = useState(false);
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await getTransaction(id);
      setTx(response.data);
    } catch (err) {
      setError(err.message);
      setTx(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    setAuditLoading(true);
    setAuditError("");
    try {
      const response = await getTransactionAudit(id);
      setAudit(response.data || []);
    } catch (err) {
      setAuditError(err.message);
      setAudit([]);
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadAudit();
  }, [id]);

  async function handleDownloadReport() {
    setReportError("");
    setReportLoading(true);
    try {
      await downloadInvestigationReport(id);
    } catch (err) {
      setReportError(err.message || "Unable to download report");
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-navy-700 bg-navy-900 p-8 text-center text-sm text-slate-soft">
        Loading transaction…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-fraud/40 bg-fraud/10 px-4 py-3 text-sm text-fraud-soft">
          {error}
        </div>
        <Link to="/transactions" className="text-sm text-accent-soft hover:text-accent">
          ← Back to transactions
        </Link>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="rounded-xl border border-dashed border-navy-600 bg-navy-900/60 p-8 text-center text-sm text-slate-muted">
        Transaction not found.
      </div>
    );
  }

  const folds = Array.isArray(tx.fold_probabilities)
    ? tx.fold_probabilities
    : [];
  const features = Array.isArray(tx.features) ? tx.features : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/transactions"
            className="text-sm text-slate-muted hover:text-accent-soft"
          >
            ← Case Database
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-wide text-ice sm:text-3xl">
            Case #{tx.id} · Threat Investigation
          </h1>
          <p className="mt-1 text-sm text-slate-soft">
            {formatDate(tx.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PredictionBadge prediction={tx.prediction} />
          <RiskBadge risk={tx.risk_level} prediction={tx.prediction} />
          <InvestigationStatusBadge status={tx.investigation_status} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailCard label="AI Verdict" value={predictionLabel(tx.prediction)} />
        <DetailCard
          label="Probability"
          value={formatProbability(tx.probability)}
        />
        <DetailCard
          label="Risk Level"
          value={String(tx.risk_level || "—").toUpperCase()}
        />
        <DetailCard
          label="Threshold"
          value={formatPercent(tx.threshold, 1)}
        />
        <DetailCard label="Created At" value={formatDate(tx.created_at)} />
        <DetailCard
          label="Analyst Status"
          value={tx.investigation_status || "Not investigated"}
        />
        <DetailCard
          label="Normalized Amount"
          value={features[28] != null ? Number(features[28]).toFixed(4) : "—"}
        />
        <DetailCard
          label="Normalized Hour"
          value={features[29] != null ? Number(features[29]).toFixed(4) : "—"}
        />
        <DetailCard
          label="is_night"
          value={features[30] != null ? String(features[30]) : "—"}
        />
        <DetailCard
          label="log_amount"
          value={features[31] != null ? Number(features[31]).toFixed(4) : "—"}
        />
        <DetailCard
          label="amount_to_mean"
          value={features[32] != null ? Number(features[32]).toFixed(4) : "—"}
        />
        <DetailCard
          label="is_high_amount"
          value={features[33] != null ? String(features[33]) : "—"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setInvestigateOpen(true)}
          className="btn-primary rounded-md px-5 py-2.5 text-sm font-semibold uppercase tracking-wide"
        >
          Investigate Case
        </button>
        <button
          type="button"
          onClick={handleDownloadReport}
          disabled={reportLoading}
          className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-ice ring-1 ring-navy-600 transition hover:bg-navy-700 disabled:opacity-60"
        >
          {reportLoading ? "Preparing report…" : "Download Investigation Report"}
        </button>
      </div>

      {reportError ? (
        <div className="rounded-xl border border-fraud/40 bg-fraud/10 px-4 py-3 text-sm text-fraud-soft">
          {reportError}
        </div>
      ) : null}

      <section className="panel rounded-xl p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
          AI Core · Fold Probabilities
        </h2>
        <ul className="mt-4 space-y-2">
          {folds.length === 0 ? (
            <li className="text-sm text-slate-muted">No fold data stored.</li>
          ) : (
            folds.map((fold, index) => (
              <li
                key={`fold-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-soft">Fold {index + 1}</span>
                <span className="font-mono text-ice">
                  {formatProbability(fold)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel rounded-xl">
        <button
          type="button"
          onClick={() => setFeaturesOpen((open) => !open)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <h2 className="text-sm font-semibold text-ice">Advanced Model Features</h2>
            <p className="mt-1 text-xs text-slate-muted">
              Anonymized model features plus interpretable inputs · {features.length} values
            </p>
          </div>
          <span className="text-sm text-accent-soft">
            {featuresOpen ? "Hide" : "Show"}
          </span>
        </button>

        {featuresOpen ? (
          <div className="max-h-80 overflow-y-auto border-t border-navy-700 px-5 py-4">
            <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {features.map((value, index) => (
                <div
                  key={`feature-${index}`}
                  className="flex items-center justify-between rounded-lg bg-navy-950/60 px-3 py-2 text-sm ring-1 ring-navy-800"
                >
                  <span className="text-slate-muted">
                    {FEATURE_NAMES[index] || `Feature ${index + 1}`}
                  </span>
                  <span className="font-mono text-ice">
                    {Number(value).toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <AuditTrail events={audit} loading={auditLoading} error={auditError} />

      <InvestigationPanel
        open={investigateOpen}
        transaction={tx}
        explanation={tx.explanation}
        onClose={() => setInvestigateOpen(false)}
        onSaved={() => {
          load();
          loadAudit();
        }}
      />
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="panel rounded-xl px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-muted">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold text-ice">{value}</p>
    </div>
  );
}

export default TransactionDetails;
