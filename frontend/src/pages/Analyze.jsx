import { useEffect, useMemo, useState } from "react";
import PredictionResult from "../components/PredictionResult";
import AnalysisSequence from "../components/AnalysisSequence";
import { FilterChip, EmptyState, ErrorBanner, Panel } from "../components/Hud";
import {
  getRandomSampleTransaction,
  getSampleTransaction,
  listSampleTransactions,
  predictTransaction,
} from "../services/api";

const SAMPLE_TYPES = [
  { id: "fraud", label: "Known Fraud" },
  { id: "legitimate", label: "Legitimate" },
  { id: "random", label: "Random Case" },
];

function formatNumber(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function Analyze() {
  const [sampleType, setSampleType] = useState("fraud");
  const [options, setOptions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState("");
  const [sample, setSample] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sequenceStage, setSequenceStage] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const featureCount = sample?.features?.length ?? 0;

  const optionLabel = useMemo(() => {
    return (item) =>
      `Row #${item.index} · Amount ${formatNumber(item.Amount, 2)} · Hour ${formatNumber(item.Hour, 2)} · ${item.label}`;
  }, []);

  async function loadOptions(type) {
    if (type === "random") {
      setOptions([]);
      setSelectedIndex("");
      return;
    }

    setOptionsLoading(true);
    setError("");
    try {
      const response = await listSampleTransactions(type, 30);
      setOptions(response.data || []);
      setSelectedIndex("");
      setSample(null);
      setResult(null);
    } catch (err) {
      setError(err.message);
      setOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  }

  useEffect(() => {
    loadOptions(sampleType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTypeChange(nextType) {
    setSampleType(nextType);
    setResult(null);
    setAdvancedOpen(false);
    setError("");

    if (nextType === "random") {
      setOptions([]);
      setSelectedIndex("");
      setSampleLoading(true);
      try {
        const response = await getRandomSampleTransaction("any");
        setSample(response.data);
      } catch (err) {
        setError(err.message);
        setSample(null);
      } finally {
        setSampleLoading(false);
      }
      return;
    }

    await loadOptions(nextType);
  }

  async function handleSelectIndex(indexValue) {
    setSelectedIndex(indexValue);
    setResult(null);
    setAdvancedOpen(false);
    setError("");

    if (indexValue === "") {
      setSample(null);
      return;
    }

    setSampleLoading(true);
    try {
      const response = await getSampleTransaction(indexValue);
      setSample(response.data);
    } catch (err) {
      setError(err.message);
      setSample(null);
    } finally {
      setSampleLoading(false);
    }
  }

  async function handleLoadAnother() {
    setResult(null);
    setAdvancedOpen(false);
    setError("");

    if (sampleType === "random") {
      setSampleLoading(true);
      try {
        const response = await getRandomSampleTransaction("any");
        setSample(response.data);
        setSelectedIndex("");
      } catch (err) {
        setError(err.message);
      } finally {
        setSampleLoading(false);
      }
      return;
    }

    setSelectedIndex("");
    setSample(null);
    await loadOptions(sampleType);
  }

  async function handleAnalyze() {
    if (!sample || analyzing) return;

    const features = sample.features;

    if (!Array.isArray(features) || features.length !== 34) {
      setError("Selected sample does not contain exactly 34 features.");
      return;
    }

    if (!features.every((v) => typeof v === "number" && Number.isFinite(v))) {
      setError("Sample features must all be numeric.");
      return;
    }

    setAnalyzing(true);
    setSequenceStage(0);
    setError("");
    setResult(null);

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stageTimer;
    if (!reduceMotion) {
      let stage = 0;
      stageTimer = setInterval(() => {
        stage += 1;
        if (stage <= 4) setSequenceStage(stage);
      }, 280);
    }

    try {
      const data = await predictTransaction(features);
      setSequenceStage(5);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (stageTimer) clearInterval(stageTimer);
      setAnalyzing(false);
    }
  }

  const interpretable = sample?.interpretable;
  const groundTruth = sample?.ground_truth;
  const advanced = sample?.advanced_features || {};

  return (
    <div className="space-y-8">
      <AnalysisSequence active={analyzing} stage={sequenceStage} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
            New Threat Analysis
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ice sm:text-3xl">
            Analyze a transaction using the FraudGuard AI engine
          </h1>
        </div>
        <span className="inline-flex w-fit items-center rounded-md bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-soft ring-1 ring-accent/30">
          Demo / Dataset Case
        </span>
      </div>

      <Panel className="p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
          Transaction Input
        </p>
        <p className="mt-1 text-xs text-slate-muted">
          Source: test_smote.csv · original feature values · Class never sent to /predict
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_TYPES.map((item) => (
            <FilterChip
              key={item.id}
              active={sampleType === item.id}
              onClick={() => handleTypeChange(item.id)}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {sampleType !== "random" ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
                Select Transaction
              </span>
              <select
                value={selectedIndex}
                disabled={optionsLoading || options.length === 0}
                onChange={(e) => handleSelectIndex(e.target.value)}
                className="w-full rounded-md border border-navy-700 bg-navy-950 px-3 py-2.5 text-sm text-ice outline-none focus:border-accent/60 disabled:opacity-50"
              >
                <option value="">
                  {optionsLoading ? "Loading samples…" : "Choose a transaction"}
                </option>
                {options.map((item) => (
                  <option key={item.index} value={String(item.index)}>
                    {optionLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <button
              type="button"
              onClick={handleLoadAnother}
              disabled={sampleLoading}
              className="btn-primary mt-6 rounded-md px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {sampleLoading ? "Scanning…" : "Generate Random Case"}
            </button>
          )}
        </div>
      </Panel>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      {sampleLoading && !sample ? (
        <div className="panel rounded-xl p-8 text-center text-sm text-slate-soft">
          Loading sample transaction…
        </div>
      ) : null}

      {sample ? (
        <>
          <ol className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted sm:grid-cols-4">
            <li className="panel rounded-md px-3 py-2 text-accent-soft">1. Transaction Input</li>
            <li className="panel rounded-md px-3 py-2">2. Feature Processor</li>
            <li className="panel rounded-md px-3 py-2">3. 5-Fold AI Ensemble</li>
            <li className="panel rounded-md px-3 py-2">4. Threat Classification</li>
          </ol>

          <Panel className="p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
                Feature Processor
              </p>
              <p className="mt-1 text-xs text-slate-muted">
                Dataset row #{sample.index} · {featureCount} model features ready
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailCard label="Normalized Amount" value={formatNumber(interpretable?.Amount, 4)} />
              <DetailCard label="Normalized Hour" value={formatNumber(interpretable?.Hour, 4)} />
              <DetailCard
                label="is_night"
                value={Number(interpretable?.is_night) === 1 ? "Yes" : "No"}
              />
              <DetailCard
                label="log_amount"
                value={formatNumber(interpretable?.log_amount, 4)}
              />
              <DetailCard
                label="amount_to_mean"
                value={formatNumber(interpretable?.amount_to_mean, 4)}
              />
              <DetailCard
                label="is_high_amount"
                value={Number(interpretable?.is_high_amount) === 1 ? "Yes" : "No"}
              />
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-navy-600 bg-navy-950/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
                Dataset Ground Truth
              </p>
              <p className="mt-2 text-sm text-slate-soft">
                For demo/testing only — not used by the model at inference time.
              </p>
              <p className="mt-2 font-mono text-lg font-semibold text-ice">
                Class = {groundTruth?.Class} ({groundTruth?.label})
              </p>
            </div>
          </Panel>

          <Panel>
            <button
              type="button"
              onClick={() => setAdvancedOpen((open) => !open)}
              className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-5"
            >
              <div>
                <h2 className="text-sm font-semibold text-ice">Advanced Model Features</h2>
                <p className="mt-1 text-xs text-slate-muted">
                  Anonymized model features V1–V28 — business meanings are unknown
                </p>
              </div>
              <span className="text-sm text-accent-soft">
                {advancedOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            {advancedOpen ? (
              <div className="max-h-80 overflow-y-auto border-t border-navy-700 px-4 py-4 sm:px-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(advanced).map(([name, value]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-md bg-navy-950/70 px-3 py-2 text-sm ring-1 ring-navy-700"
                    >
                      <span className="font-mono text-slate-muted">{name}</span>
                      <span className="font-mono text-ice">{formatNumber(value, 6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || featureCount !== 34}
              className="btn-primary inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? "Analyzing…" : "Analyze Transaction"}
            </button>
            <button
              type="button"
              onClick={handleLoadAnother}
              disabled={analyzing || sampleLoading}
              className="rounded-md bg-navy-800 px-4 py-2.5 text-sm font-medium text-ice ring-1 ring-navy-600 disabled:opacity-50"
            >
              Load Another Transaction
            </button>
          </div>
        </>
      ) : (
        !sampleLoading && (
          <EmptyState>Select a sample type and transaction to begin analysis.</EmptyState>
        )
      )}

      {result ? (
        <div className="space-y-4">
          <PredictionResult result={result} />
          <button
            type="button"
            onClick={handleLoadAnother}
            className="rounded-md bg-navy-800 px-4 py-2.5 text-sm font-medium text-ice ring-1 ring-navy-600"
          >
            Analyze Another Transaction
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-navy-700/80 bg-navy-950/40 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-muted">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold text-ice">{value}</p>
    </div>
  );
}

export default Analyze;
