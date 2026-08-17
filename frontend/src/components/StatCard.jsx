function StatCard({ label, value, hint, tone = "default" }) {
  const tones = {
    default: "border-cyan-400/15",
    fraud: "border-fraud/30",
    legit: "border-legit/30",
    accent: "border-accent/30",
    warn: "border-warn/30",
  };

  return (
    <div
      className={`panel panel-hover rounded-xl p-4 ${tones[tone] || tones.default}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-ice sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-muted">{hint}</p> : null}
    </div>
  );
}

export default StatCard;
