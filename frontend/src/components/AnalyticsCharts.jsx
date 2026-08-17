import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "../context/ThemeContext";

function useChartTheme() {
  const { isLight } = useTheme();
  return {
    tooltip: {
      backgroundColor: isLight ? "#ffffff" : "#070b1a",
      border: isLight ? "1px solid #d9e1ea" : "1px solid rgba(34,211,238,0.25)",
      borderRadius: "8px",
      color: isLight ? "#111827" : "#e8f1ff",
      fontSize: "12px",
    },
    tick: { fill: isLight ? "#64748b" : "#9bb0c9", fontSize: 11 },
    grid: isLight ? "#d9e1ea" : "#152044",
    accent: isLight ? "#0284c7" : "#22d3ee",
  };
}

const COLORS = {
  fraud: "#ef4444",
  legitimate: "#10b981",
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  accent: "#22d3ee",
  muted: "#8b5cf6",
};

export function ChartCard({ title, subtitle, children, empty }) {
  return (
    <section className="panel min-w-0 rounded-xl p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ice">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs text-slate-muted">{subtitle}</p>
        ) : null}
      </div>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-muted">
          No data for this range
        </div>
      ) : (
        <div className="h-56 w-full min-w-0 sm:h-64">{children}</div>
      )}
    </section>
  );
}

export function PredictionPieChart({ data }) {
  const chart = useChartTheme();
  const chartData = [
    { name: "Fraud", value: data?.fraud ?? 0, color: COLORS.fraud },
    {
      name: "Legitimate",
      value: data?.legitimate ?? 0,
      color: COLORS.legitimate,
    },
  ];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartCard
      title="Threat Distribution"
      subtitle="Model prediction — fraud vs legitimate"
      empty={total === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={chart.tooltip} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RiskMeterChart({ data }) {
  const rows = [
    { name: "LOW", count: data?.low ?? 0, fill: COLORS.low },
    { name: "MEDIUM", count: data?.medium ?? 0, fill: COLORS.medium },
    { name: "HIGH", count: data?.high ?? 0, fill: COLORS.high },
  ];
  const total = rows.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartCard
      title="Risk Distribution"
      subtitle="Counts by stored risk_level"
      empty={total === 0}
    >
      <div className="flex h-full flex-col justify-center gap-5">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wider text-slate-soft">{row.name}</span>
              <span className="font-mono text-ice">{row.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy-700">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${total ? (row.count / total) * 100 : 0}%`,
                  background: row.fill,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export function ProbabilityBarChart({ data }) {
  const chart = useChartTheme();
  const chartData = Array.isArray(data) ? data : [];
  const total = chartData.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <ChartCard
      title="Fraud Probability Distribution"
      subtitle="Ensemble probability buckets"
      empty={total === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis dataKey="range" tick={chart.tick} />
          <YAxis allowDecimals={false} tick={chart.tick} />
          <Tooltip contentStyle={chart.tooltip} />
          <Bar dataKey="count" fill={chart.accent} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ActivityLineChart({ data }) {
  const chart = useChartTheme();
  const chartData = Array.isArray(data) ? data : [];

  return (
    <ChartCard
      title="Transaction Activity"
      subtitle="Volume and fraud over time"
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={chart.tick} minTickGap={24} />
          <YAxis allowDecimals={false} tick={chart.tick} />
          <Tooltip contentStyle={chart.tooltip} />
          <Legend />
          <Line
            type="monotone"
            dataKey="transactions"
            name="Transactions"
            stroke={chart.accent}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="fraud"
            name="Fraud"
            stroke={COLORS.fraud}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function InvestigationStatusChart({ data }) {
  const chart = useChartTheme();
  const chartData = [
    { name: "Under Review", count: data?.under_review ?? 0, fill: COLORS.medium },
    { name: "Confirmed Fraud", count: data?.confirmed_fraud ?? 0, fill: COLORS.fraud },
    { name: "False Positive", count: data?.false_positives ?? 0, fill: COLORS.accent },
    {
      name: "Confirmed Legit",
      count: data?.confirmed_legitimate ?? 0,
      fill: COLORS.legitimate,
    },
  ];
  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartCard
      title="Investigation Status"
      subtitle="Analyst decisions — not model predictions"
      empty={total === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={chart.tick} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={chart.tick} />
          <Tooltip contentStyle={chart.tooltip} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ModelVsAnalystChart({ data }) {
  const chart = useChartTheme();
  const chartData = Array.isArray(data)
    ? data.map((row) => ({
        name: `${row.model_prediction} / ${String(row.analyst_decision || "").replace(/_/g, " ")}`,
        count: row.count,
      }))
    : [];

  return (
    <ChartCard
      title="Model Prediction vs Analyst Decision"
      subtitle="Comparison only — analyst decisions are not ground truth"
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tick={chart.tick} />
          <YAxis type="category" dataKey="name" width={120} tick={chart.tick} />
          <Tooltip contentStyle={chart.tooltip} />
          <Bar dataKey="count" fill={COLORS.muted} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
