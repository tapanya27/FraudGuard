export function Panel({ children, className = "", hover = false }) {
  return (
    <section
      className={`panel rounded-xl ${hover ? "panel-hover" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ kicker, title, subtitle }) {
  return (
    <div>
      {kicker ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
          {kicker}
        </p>
      ) : null}
      {title ? (
        <h2 className="mt-1 text-lg font-semibold tracking-wide text-ice sm:text-xl">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function StatusDot({ online, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "animate-pulse-dot bg-legit" : "bg-slate-muted"
        }`}
        aria-hidden="true"
      />
      <span className={online ? "text-legit-soft" : "text-slate-muted"}>
        {label}
      </span>
    </span>
  );
}

export function FilterChip({ active, onClick, children, tone = "cyan" }) {
  const activeClass =
    tone === "warn"
      ? "bg-warn/15 text-warn ring-warn/40"
      : tone === "fraud"
        ? "bg-fraud/15 text-fraud-soft ring-fraud/40"
        : "bg-accent/10 text-accent-soft ring-accent/40";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
        active
          ? `${activeClass} ring-1`
          : "bg-navy-800/60 text-slate-soft ring-1 ring-navy-700 hover:text-ice"
      }`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="panel rounded-xl border-dashed px-4 py-10 text-center text-sm text-slate-muted">
      {children}
    </div>
  );
}

export function ErrorBanner({ children }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-fraud/40 bg-fraud/10 px-4 py-3 text-sm text-fraud-soft"
    >
      {children}
    </div>
  );
}
