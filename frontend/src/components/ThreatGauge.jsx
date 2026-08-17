/**
 * Dashboard Threat Index — NOT a model score.
 * Derived only from existing analytics: fraud rate + high-risk share.
 */
export function deriveThreatIndex(summary) {
  const total = Number(summary?.total_transactions) || 0;
  const fraudRate = Number(summary?.fraud_rate) || 0;
  const highRisk = Number(summary?.high_risk_transactions) || 0;
  const highShare = total === 0 ? 0 : (highRisk / total) * 100;
  const index = Number(Math.min(100, fraudRate * 0.65 + highShare * 0.35).toFixed(1));

  let level = "LOW";
  if (index >= 20) level = "HIGH";
  else if (index >= 8) level = "ELEVATED";

  return { index, level, fraudRate, highShare };
}

export function ThreatGauge({ summary }) {
  const { index, level } = deriveThreatIndex(summary);
  const color =
    level === "HIGH" ? "#ef4444" : level === "ELEVATED" ? "#f59e0b" : "#10b981";
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (index / 100) * circ;

  return (
    <section className="panel flex h-full flex-col items-center justify-center rounded-xl px-5 py-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-muted">
        Current Threat Level
      </p>
      <div className="relative mt-4">
        <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(34,211,238,0.12)"
            strokeWidth="10"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-3xl font-semibold" style={{ color }}>
            {level}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-muted">{index}</p>
        </div>
      </div>
      <p className="mt-4 max-w-xs text-center text-[11px] leading-relaxed text-slate-muted">
        Dashboard Threat Index — derived from fraud rate and high-risk share in
        the selected range. Not fraud probability and not model confidence.
      </p>
    </section>
  );
}
