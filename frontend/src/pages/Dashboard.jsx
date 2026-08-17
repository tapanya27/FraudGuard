import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import TransactionTable from "../components/TransactionTable";
import SystemStatus from "../components/SystemStatus";
import { ThreatGauge } from "../components/ThreatGauge";
import LiveThreatFeed from "../components/LiveThreatFeed";
import AnalystProgression from "../components/AnalystProgression";
import { EmptyState, ErrorBanner, FilterChip, SectionLabel } from "../components/Hud";
import {
  ActivityLineChart,
  InvestigationStatusChart,
  ModelVsAnalystChart,
  PredictionPieChart,
  ProbabilityBarChart,
  RiskMeterChart,
} from "../components/AnalyticsCharts";
import { getAnalytics, getHealth, getTransactions } from "../services/api";
import { formatProbability } from "../utils/format";

const RANGES = [
  { id: "all", label: "All Time" },
  { id: "24h", label: "Last 24 Hours" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
];

function Dashboard() {
  const [range, setRange] = useState("all");
  const [analytics, setAnalytics] = useState(null);
  const [feed, setFeed] = useState([]);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setHealthLoading(true);
      setHealthError("");
      try {
        const data = await getHealth();
        if (!cancelled) setHealth(data);
      } catch (err) {
        if (!cancelled) {
          setHealth(null);
          setHealthError(err.message);
        }
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    }

    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [data, tx] = await Promise.all([
          getAnalytics(range),
          getTransactions(1, 8, { sort: "newest" }),
        ]);
        if (!cancelled) {
          setAnalytics(data);
          setFeed(tx.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load analytics. Please try again.");
          setAnalytics(null);
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
  }, [range]);

  const summary = analytics?.summary;
  const total = summary?.total_transactions ?? 0;
  const isEmpty = !loading && !error && total === 0;
  const feedback = analytics?.investigation_feedback;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
            Threat Command Center
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-wide text-ice sm:text-3xl">
            Fraud Intelligence Operations
          </h1>
          <p className="mt-1 text-sm text-slate-muted">
            Live analytics from PostgreSQL via the Node API — no client-side aggregation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <FilterChip
              key={item.id}
              active={range === item.id}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <SystemStatus health={health} loading={healthLoading} error={healthError} />

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      {loading ? (
        <div className="panel rounded-xl p-8 text-center text-sm text-slate-soft">
          Synchronizing command center…
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState>
          No transaction data available yet. Analyze a transaction to populate analytics.
        </EmptyState>
      ) : null}

      {!loading && !error && analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total Transactions"
              value={summary?.total_transactions ?? 0}
              hint="Transaction volume"
              tone="accent"
            />
            <StatCard
              label="Fraud Detected"
              value={summary?.fraud_transactions ?? 0}
              tone="fraud"
            />
            <StatCard
              label="High Risk"
              value={summary?.high_risk_transactions ?? 0}
              tone="warn"
            />
            <StatCard
              label="Fraud Rate"
              value={`${Number(summary?.fraud_rate ?? 0).toFixed(2)}%`}
              hint="Share of predictions classified as fraud"
            />
            <StatCard
              label="Average Probability"
              value={formatProbability(summary?.average_probability ?? 0)}
              hint="Mean ensemble fraud probability"
            />
            <StatCard
              label="Cases Investigated"
              value={feedback?.total_investigations ?? 0}
              tone="accent"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <ThreatGauge summary={summary} />
            </div>
            <div className="lg:col-span-3">
              <LiveThreatFeed rows={feed} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PredictionPieChart data={analytics.prediction_distribution} />
            <RiskMeterChart data={analytics.risk_distribution} />
          </div>

          <ProbabilityBarChart data={analytics.probability_distribution} />
          <ActivityLineChart data={analytics.time_series} />

          <section id="investigations" className="space-y-4 scroll-mt-24">
            <SectionLabel
              kicker="Investigations"
              title="Analyst Investigation"
              subtitle="Analyst decisions are stored separately from model predictions and are not ground truth."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Cases Investigated"
                value={feedback?.total_investigations ?? 0}
                tone="accent"
              />
              <StatCard
                label="Under Review"
                value={feedback?.under_review ?? 0}
                tone="warn"
              />
              <StatCard
                label="Confirmed Fraud"
                value={feedback?.confirmed_fraud ?? 0}
                tone="fraud"
              />
              <StatCard
                label="False Positive"
                value={feedback?.false_positives ?? 0}
              />
              <StatCard
                label="Confirmed Legitimate"
                value={feedback?.confirmed_legitimate ?? 0}
                tone="legit"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <InvestigationStatusChart data={feedback?.status_distribution} />
              <ModelVsAnalystChart data={feedback?.model_vs_analyst} />
            </div>
            <AnalystProgression feedback={feedback} />
          </section>

          <section className="space-y-4">
            <SectionLabel
              title="Recent High-Risk Cases"
              subtitle="Latest HIGH risk_level records in the selected range"
            />
            <TransactionTable
              rows={analytics.recent_high_risk || []}
              emptyMessage="No high-risk transactions in this range."
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

export default Dashboard;
