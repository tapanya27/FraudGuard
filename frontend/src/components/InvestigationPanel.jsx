import { useEffect, useState } from "react";
import InvestigationStatusBadge from "./InvestigationStatusBadge";
import RiskBadge, { PredictionBadge } from "./RiskBadge";
import {
  getInvestigation,
  saveInvestigation,
} from "../services/api";
import {
  formatDate,
  formatPercent,
  formatProbability,
  predictionLabel,
} from "../utils/format";

const STATUSES = [
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "CONFIRMED_FRAUD", label: "Confirm Fraud" },
  { id: "FALSE_POSITIVE", label: "False Positive" },
  { id: "CONFIRMED_LEGITIMATE", label: "Confirm Legitimate" },
];

function InvestigationPanel({
  transaction,
  explanation = null,
  open = true,
  onClose,
  onSaved,
}) {
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (!open || !transaction?.id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await getInvestigation(transaction.id);
        if (cancelled) return;
        if (response.investigation) {
          setStatus(response.investigation.status || "UNDER_REVIEW");
          setNotes(response.investigation.analyst_notes || "");
          setSaved(response.investigation);
        } else {
          setStatus("UNDER_REVIEW");
          setNotes("");
          setSaved(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, transaction?.id]);

  if (!open || !transaction) return null;

  const positive = Array.isArray(explanation?.top_positive)
    ? explanation.top_positive.slice(0, 5)
    : [];

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const response = await saveInvestigation(transaction.id, {
        status,
        analyst_notes: notes,
      });
      setSaved(response.investigation);
      if (onSaved) {
        onSaved(response.investigation);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 p-2.5 sm:items-center sm:p-4">
      <div className="panel max-h-[90vh] w-[calc(100%-20px)] max-w-3xl overflow-y-auto rounded-2xl sm:w-full">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-navy-700 bg-navy-900/95 px-4 py-4 backdrop-blur sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
              Investigation Mode
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-wide text-ice">
              Case #{transaction.id} · Threat Investigation
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-soft hover:bg-navy-800 hover:text-ice"
            >
              Close
            </button>
          ) : null}
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <PredictionBadge prediction={transaction.prediction} />
            <RiskBadge
              risk={transaction.risk_level}
              prediction={transaction.prediction}
            />
            <InvestigationStatusBadge status={saved?.status || status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="AI Verdict" value={predictionLabel(transaction.prediction)} />
            <Info
              label="Fraud Probability"
              value={formatProbability(transaction.probability)}
            />
            <Info
              label="Risk Level"
              value={String(transaction.risk_level || "—").toUpperCase()}
            />
            <Info
              label="Threshold"
              value={formatPercent(transaction.threshold, 1)}
            />
            <Info
              label="Created"
              value={formatDate(transaction.created_at)}
            />
            <Info
              label="Current Status"
              value={saved?.status || status || "UNDER_REVIEW"}
            />
          </div>

          <div className="rounded-xl border border-navy-700 bg-navy-950/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
              Analyst Decision
            </p>
            <p className="mt-2 text-sm text-slate-soft">
              Model prediction is preserved separately. Analyst status never
              overwrites the stored XGBoost result. FALSE_POSITIVE means the
              model predicted fraud and the analyst judged it legitimate.
            </p>
          </div>

          {positive.length > 0 ? (
            <div className="rounded-xl border border-navy-700 bg-navy-950/40 p-4">
              <h3 className="text-sm font-semibold text-ice">Top SHAP Factors</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {positive.map((item) => (
                  <li
                    key={item.feature}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-mono text-slate-soft">{item.feature}</span>
                    <span className="font-mono text-fraud-soft">
                      +{Number(item.shap_value).toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-soft">Loading investigation…</p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  Investigation Status
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {STATUSES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatus(item.id)}
                      className={`min-h-11 w-full rounded-lg px-3 py-2 text-sm font-medium transition sm:w-auto ${
                        status === item.id
                          ? "bg-accent/20 text-accent-soft ring-1 ring-accent/40"
                          : "bg-navy-950 text-slate-soft ring-1 ring-navy-700 hover:text-ice"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
                  Investigation Notes
                </span>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter investigation findings..."
                  className="min-h-24 w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-sm text-ice outline-none focus:border-accent/60"
                />
              </label>
            </>
          )}

          {error ? (
            <div className="rounded-lg border border-fraud/40 bg-fraud/10 px-3 py-2 text-sm text-fraud-soft">
              {error}
            </div>
          ) : null}

          {saved ? (
            <div className="rounded-lg border border-legit/30 bg-legit/10 px-3 py-2 text-sm text-legit-soft">
              Investigation saved · Case updated · {formatDate(saved.updated_at || saved.created_at)}
            </div>
          ) : null}

          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSave}
            className="btn-primary w-full rounded-md px-5 py-2.5 text-sm disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving…" : "Save Investigation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-navy-700/80 bg-navy-950/30 px-3 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-ice">{value}</p>
    </div>
  );
}

export default InvestigationPanel;
