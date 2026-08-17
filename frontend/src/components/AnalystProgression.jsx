const MILESTONES = [
  { id: "first", label: "First case", min: 1, field: "total" },
  { id: "fraud", label: "First fraud confirmed", min: 1, field: "fraud" },
  { id: "ten", label: "10 cases investigated", min: 10, field: "total" },
  { id: "fifty", label: "50 cases investigated", min: 50, field: "total" },
];

export function buildProgression(feedback) {
  const total = Number(feedback?.total_investigations) || 0;
  const fraud = Number(feedback?.confirmed_fraud) || 0;
  const level = Math.max(1, 1 + Math.floor(total / 10));
  const intoLevel = total % 10;
  const percent = total === 0 ? 0 : (intoLevel / 10) * 100;
  const nextAt = level * 10;
  const achievements = MILESTONES.map((item) => {
    const value = item.field === "fraud" ? fraud : total;
    return { ...item, unlocked: value >= item.min };
  });
  return { total, fraud, level, percent, nextAt, achievements };
}

function AnalystProgression({ feedback }) {
  const { total, level, percent, nextAt, achievements } = buildProgression(feedback);

  return (
    <section className="panel rounded-xl p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-muted">
        Analyst Progression
      </p>
      <p className="mt-1 text-xs text-slate-muted">
        Derived from investigation records in the database. Not ML accuracy,
        fraud probability, or model confidence.
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-mono text-sm text-accent-soft">Analyst Level {String(level).padStart(2, "0")}</p>
        <p className="font-mono text-xs text-slate-muted">
          {total} investigated · next at {nextAt}
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-700"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Analyst progression"
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
        Investigation Achievements
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {achievements.map((item) => (
          <li
            key={item.id}
            className={`rounded-md px-3 py-2 text-xs ring-1 ${
              item.unlocked
                ? "bg-accent/10 text-ice ring-accent/30"
                : "bg-navy-800/40 text-slate-muted ring-navy-700"
            }`}
          >
            <span className="font-semibold uppercase tracking-wider">
              {item.unlocked ? "Case milestone" : "Locked"}
            </span>
            <p className="mt-1">{item.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AnalystProgression;
