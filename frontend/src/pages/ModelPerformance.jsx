import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import StatCard from "../components/StatCard";
import { auditModelPerformanceView, getHealth } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import {
  EVALUATION_NOTE,
  MODEL_COMPARISON,
  PIPELINE_STEPS,
  PRODUCTION_MODEL,
  SELECTION_RATIONALE,
} from "../data/modelEvaluation";

function formatPct(value) {
  return `${Number(value).toFixed(2)}%`;
}

function ModelPerformance() {
  const { isLight } = useTheme();
  const TOOLTIP_STYLE = {
    backgroundColor: isLight ? "#ffffff" : "#0f1a30",
    border: isLight ? "1px solid #d9e1ea" : "1px solid #2a4068",
    borderRadius: "8px",
    color: isLight ? "#111827" : "#e8eef8",
    fontSize: "12px",
  };
  const AXIS_TICK = { fill: isLight ? "#64748b" : "#94a3b8", fontSize: 11 };
  const GRID = isLight ? "#d9e1ea" : "#1e2f4d";
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setHealthLoading(true);
      setHealthError("");
      try {
        const data = await getHealth();
        if (!cancelled) {
          setHealth(data);
        }
        // Fire-and-forget audit (admin-only page)
        auditModelPerformanceView().catch(() => {});
      } catch (err) {
        if (!cancelled) {
          setHealth(null);
          setHealthError(err.message || "Unable to load system status");
        }
      } finally {
        if (!cancelled) {
          setHealthLoading(false);
        }
      }
    }

    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const f1ChartData = MODEL_COMPARISON.map((row) => ({
    name: row.shortLabel || row.model,
    f1: row.f1,
    selected: row.selected,
  }));

  const precisionRecallData = MODEL_COMPARISON.map((row) => ({
    name: row.shortLabel || row.model,
    precision: row.precision,
    recall: row.recall,
    selected: row.selected,
  }));

  const mlConnected = health?.ml_service === "connected";
  const dbConnected = health?.database === "connected";
  const backendRunning = health?.backend === "running";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-wide text-ice sm:text-3xl">
          AI Core Diagnostics
        </h1>
        <p className="mt-1 text-sm text-slate-muted">
          Evaluation and monitoring of the production fraud detection model.
        </p>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-soft">
        {EVALUATION_NOTE}
      </div>

      {/* Section 1 — Production model */}
      <section className="panel rounded-2xl border-accent/30 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-soft">
              Production Model
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-ice">
              {PRODUCTION_MODEL.name}
            </h2>
          </div>
          <span className="rounded-md bg-legit/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-legit-soft ring-1 ring-legit/40">
            {PRODUCTION_MODEL.status}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Accuracy" value={formatPct(PRODUCTION_MODEL.accuracy)} />
          <MiniMetric label="Precision" value={formatPct(PRODUCTION_MODEL.precision)} />
          <MiniMetric label="Recall" value={formatPct(PRODUCTION_MODEL.recall)} />
          <MiniMetric
            label="F1 Score"
            value={formatPct(PRODUCTION_MODEL.f1)}
            emphasize
          />
        </div>

        <div className="mt-5 rounded-xl border border-navy-700/80 bg-navy-950/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-muted">
            Decision Threshold
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ice">
            {PRODUCTION_MODEL.thresholdPercent}%
          </p>
          <p className="mt-2 text-sm text-slate-soft">
            Predictions are classified as fraud when ensemble probability
            exceeds the selected threshold ({PRODUCTION_MODEL.threshold}).
          </p>
        </div>

        <ul className="mt-5 space-y-2 text-sm text-slate-soft">
          {SELECTION_RATIONALE.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 2 — Metric cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ice">
          Production Metrics
          <span className="ml-2 text-xs font-normal text-slate-muted">
            (evaluation results)
          </span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Accuracy"
            value={formatPct(PRODUCTION_MODEL.accuracy)}
            hint="Informative but not primary for imbalanced fraud data"
          />
          <StatCard
            label="Precision"
            value={formatPct(PRODUCTION_MODEL.precision)}
            tone="accent"
          />
          <StatCard
            label="Recall"
            value={formatPct(PRODUCTION_MODEL.recall)}
            tone="warn"
          />
          <StatCard
            label="F1 Score (Primary)"
            value={formatPct(PRODUCTION_MODEL.f1)}
            tone="legit"
            hint="Primary selection metric for this comparison"
          />
        </div>
      </section>

      {/* Section 3 — Comparison table */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-ice">Model Comparison</h2>
          <p className="text-sm text-slate-muted">
            Evaluation Results from completed experiments
          </p>
        </div>
        <div className="panel overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-navy-700 text-left text-sm">
              <thead className="bg-navy-850 text-xs uppercase tracking-wider text-slate-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Accuracy</th>
                  <th className="px-4 py-3 font-medium">Precision</th>
                  <th className="px-4 py-3 font-medium">Recall</th>
                  <th className="px-4 py-3 font-medium">F1 Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {MODEL_COMPARISON.map((row) => (
                  <tr
                    key={row.model}
                    className={
                      row.selected
                        ? "bg-accent/10 ring-1 ring-inset ring-accent/30"
                        : "hover:bg-navy-850/80"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-ice">
                      {row.model}
                      {row.selected ? (
                        <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
                          Selected
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-soft">
                      {formatPct(row.accuracy)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-soft">
                      {formatPct(row.precision)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-soft">
                      {formatPct(row.recall)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        row.selected ? "font-semibold text-legit-soft" : "text-slate-soft"
                      }`}
                    >
                      {formatPct(row.f1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4 — F1 chart */}
      <section className="panel rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ice">
          F1 Score Comparison
        </h2>
        <p className="mt-1 text-xs text-slate-muted">
          Evaluation Results — higher F1 is better for this comparison
        </p>
        <div className="mt-4 h-80 w-full sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={f1ChartData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={AXIS_TICK}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={AXIS_TICK}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, "F1"]}
              />
              <Bar dataKey="f1" radius={[0, 6, 6, 0]}>
                {f1ChartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.selected ? "#22c55e" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 5 — Precision / Recall */}
      <section className="panel rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ice">
          Precision vs Recall
        </h2>
        <p className="mt-1 text-xs text-slate-muted">
          Evaluation Results — tradeoff across tested models
        </p>
        <div className="mt-4 h-80 w-full sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={precisionRecallData}
              margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
            >
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={AXIS_TICK}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tick={AXIS_TICK}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => `${Number(value).toFixed(2)}%`}
              />
              <Legend />
              <Bar
                dataKey="precision"
                name="Precision"
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="recall"
                name="Recall"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 6 — Ensemble */}
      <section className="panel rounded-xl p-5">
        <h2 className="text-lg font-semibold text-ice">5-Fold Ensemble</h2>
        <p className="mt-2 text-sm text-slate-soft">
          The production predictor loads five fold-specific XGBoost models and
          averages their fraud probabilities before applying the production
          threshold.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((fold) => (
            <div
              key={fold}
              className="rounded-lg border border-navy-700 bg-navy-950/50 px-3 py-4 text-center"
            >
              <p className="text-xs text-slate-muted">Model</p>
              <p className="mt-1 font-mono text-sm font-semibold text-ice">
                Fold {fold}
              </p>
              <p className="mt-1 text-[10px] text-slate-muted">xgb_fold_{fold}.json</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-muted">
          Runtime fold probabilities are shown on Analyze Transaction for each
          live prediction — they are not hardcoded on this page.
        </p>
      </section>

      {/* Section 7 — Pipeline */}
      <section className="panel rounded-xl p-5">
        <h2 className="text-lg font-semibold text-ice">Model Pipeline</h2>
        <p className="mt-1 text-sm text-slate-muted">
          Consistent with the current FraudGuard inference path
        </p>
        <ol className="mt-5 space-y-0">
          {PIPELINE_STEPS.map((step, index) => (
            <li key={step} className="flex flex-col items-start">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 font-mono text-xs text-accent-soft ring-1 ring-navy-600">
                  {index + 1}
                </span>
                <span className="text-sm text-ice">{step}</span>
              </div>
              {index < PIPELINE_STEPS.length - 1 ? (
                <div className="ml-4 h-4 w-px bg-navy-600" />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Section 8 — Live status */}
      <section className="panel rounded-xl p-5">
        <h2 className="text-lg font-semibold text-ice">Model Status</h2>
        <p className="mt-1 text-sm text-slate-muted">
          Live checks via <span className="font-mono">GET /api/health</span>
        </p>

        {healthLoading ? (
          <p className="mt-4 text-sm text-slate-soft">Loading system status…</p>
        ) : null}

        {healthError ? (
          <div className="mt-4 rounded-lg border border-fraud/40 bg-fraud/10 px-3 py-2 text-sm text-fraud-soft">
            Status unavailable: {healthError}
          </div>
        ) : null}

        {!healthLoading ? (
          <ul className="mt-4 space-y-3 text-sm">
            <StatusItem
              label="Production model / FastAPI inference"
              active={mlConnected}
              detail={
                mlConnected
                  ? "ML service connected (5-fold ensemble loaded by FastAPI)"
                  : "ML service disconnected"
              }
            />
            <StatusItem
              label="5 XGBoost folds available"
              active={mlConnected}
              detail={
                mlConnected
                  ? "Served by the connected FastAPI ML service"
                  : "Unavailable while ML service is down"
              }
            />
            <StatusItem
              label="Node.js API orchestration"
              active={backendRunning}
              detail={backendRunning ? "Express backend running" : "Backend not reporting"}
            />
            <StatusItem
              label="SHAP explanation path"
              active={mlConnected}
              detail={
                mlConnected
                  ? "SHAP runs in FastAPI on /predict (same ML service)"
                  : "Unavailable while ML service is down"
              }
            />
            <StatusItem
              label="PostgreSQL persistence"
              active={dbConnected}
              detail={
                dbConnected ? "Database connected" : "Database disconnected"
              }
            />
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function MiniMetric({ label, value, emphasize = false }) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        emphasize
          ? "border-legit/40 bg-legit/10"
          : "border-navy-700/70 bg-navy-950/30"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-slate-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          emphasize ? "text-legit-soft" : "text-ice"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusItem({ label, active, detail }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-navy-700/80 bg-navy-950/40 px-3 py-3">
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
          active ? "bg-legit" : "bg-slate-muted"
        }`}
      />
      <div>
        <p className="font-medium text-ice">{label}</p>
        <p className="mt-0.5 text-xs text-slate-muted">{detail}</p>
      </div>
    </li>
  );
}

export default ModelPerformance;
