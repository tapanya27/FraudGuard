import { useState } from "react";
import { Link } from "react-router-dom";
import RiskBadge, { PredictionBadge } from "./RiskBadge";
import InvestigationPanel from "./InvestigationPanel";
import { formatPercent, formatProbability } from "../utils/format";

function shapName(name) {
  if (/^V\d+$/i.test(name)) return name;
  return name;
}

function PredictionResult({ result }) {
  if (!result) return null;

  const isFraud = Number(result.prediction) === 1;
  const folds = Array.isArray(result.fold_probabilities)
    ? result.fold_probabilities
    : [];
  const explanation = result.explanation;
  const aboveThreshold =
    typeof result.probability === "number" &&
    typeof result.threshold === "number" &&
    result.probability >= result.threshold;
  const showHighRiskAlert = isFraud && aboveThreshold;
  const [investigateOpen, setInvestigateOpen] = useState(false);

  return (
    <>
      {showHighRiskAlert ? (
        <div className="mb-4 panel rounded-2xl border-fraud/40 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fraud-soft">
                High Risk Case
              </p>
              <h3 className="mt-1 text-xl font-semibold text-ice">
                Case #{result.id}
              </h3>
              <p className="mt-1 text-sm text-slate-soft">
                Fraud Probability: {formatProbability(result.probability)} · at
                or above threshold {formatPercent(result.threshold, 1)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvestigateOpen(true)}
              className="rounded-md bg-fraud px-4 py-2.5 text-sm font-semibold text-white"
            >
              Investigate Case
            </button>
          </div>
        </div>
      ) : null}

      <section
        className={`panel rounded-2xl p-5 sm:p-8 ${
          isFraud ? "border-fraud/35" : "border-legit/35"
        }`}
      >
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-muted">
          {isFraud ? "Threat Detected" : "Transaction Cleared"}
        </p>
        <h2
          className={`mt-3 text-center text-4xl font-semibold tracking-[0.12em] ${
            isFraud ? "text-fraud-soft" : "text-legit-soft"
          }`}
        >
          {isFraud ? "FRAUD" : "LEGITIMATE"}
        </h2>
        <p className="mt-3 text-center font-mono text-lg text-ice">
          {formatProbability(result.probability)} probability
        </p>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.16em] text-slate-muted">
          {String(result.risk_level || "—").toUpperCase()} RISK
        </p>

        {result.id ? (
          <p className="mt-4 text-center text-sm text-slate-soft">
            Saved as{" "}
            <Link
              to={`/transactions/${result.id}`}
              className="font-mono text-accent-soft hover:text-accent"
            >
              Case #{result.id}
            </Link>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <PredictionBadge prediction={result.prediction} />
          <RiskBadge risk={result.risk_level} prediction={result.prediction} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Probability" value={formatProbability(result.probability)} />
          <Metric label="Risk" value={String(result.risk_level || "—").toUpperCase()} />
          <Metric label="AI Verdict" value={isFraud ? "FRAUD" : "LEGITIMATE"} />
          <Metric label="Threshold" value={formatPercent(result.threshold, 1)} />
        </div>

        <ExplanationPanel explanation={explanation} />

        <div className="mt-6 rounded-xl border border-navy-700/80 bg-navy-950/40 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
            AI Core · 5-Fold Ensemble
          </h3>
          <ul className="mt-4 space-y-3">
            {folds.map((fold, index) => {
              const pct = Number(fold) * 100;
              return (
                <li key={`fold-${index}`}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-mono text-slate-soft">
                      Fold {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-ice">
                      {formatProbability(fold)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-navy-700">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {result.id ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setInvestigateOpen(true)}
              className="btn-primary w-full rounded-md px-5 py-3 text-sm uppercase tracking-wide sm:w-auto"
            >
              Investigate Case
            </button>
          </div>
        ) : null}
      </section>

      <InvestigationPanel
        open={investigateOpen}
        transaction={result}
        explanation={explanation}
        onClose={() => setInvestigateOpen(false)}
      />
    </>
  );
}

function ExplanationPanel({ explanation }) {
  if (!explanation) {
    return (
      <div className="mt-6 rounded-xl border border-navy-700/80 bg-navy-950/40 p-4">
        <h3 className="text-sm font-semibold text-ice">AI Evidence</h3>
        <p className="mt-2 text-sm text-slate-muted">Explanation unavailable</p>
      </div>
    );
  }

  const positive = Array.isArray(explanation.top_positive)
    ? explanation.top_positive
    : [];
  const negative = Array.isArray(explanation.top_negative)
    ? explanation.top_negative
    : [];

  const maxAbs = Math.max(
    0.0001,
    ...positive.map((item) => Math.abs(item.shap_value)),
    ...negative.map((item) => Math.abs(item.shap_value))
  );

  return (
    <div className="mt-6 rounded-xl border border-navy-700/80 bg-navy-950/40 p-4 sm:p-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ice">
        AI Evidence
      </h3>
      <p className="mt-1 text-xs text-slate-muted">
        Why did the model classify this transaction this way? Mean SHAP across the 5-fold ensemble. Anonymized V-features have no assigned business meaning.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <ContributionList
          title="Threat Amplifiers"
          items={positive}
          maxAbs={maxAbs}
          tone="positive"
          empty="No positive SHAP contributions"
        />
        <ContributionList
          title="Risk Reducers"
          items={negative}
          maxAbs={maxAbs}
          tone="negative"
          empty="No negative SHAP contributions"
        />
      </div>
    </div>
  );
}

function ContributionList({ title, items, maxAbs, tone, empty }) {
  const barClass = tone === "positive" ? "bg-fraud/80" : "bg-legit/70";
  const valueClass =
    tone === "positive" ? "text-fraud-soft" : "text-legit-soft";

  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => {
            const width = `${(Math.abs(item.shap_value) / maxAbs) * 100}%`;
            const sign = item.shap_value >= 0 ? "+" : "";
            return (
              <li key={`${tone}-${item.feature}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono text-ice">{shapName(item.feature)}</span>
                  <span className={`font-mono ${valueClass}`}>
                    {sign}
                    {Number(item.shap_value).toFixed(4)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-navy-800">
                  <div className={`h-full rounded-full ${barClass}`} style={{ width }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-navy-700/70 bg-navy-950/30 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-ice">{value}</p>
    </div>
  );
}

export default PredictionResult;
