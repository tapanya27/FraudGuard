function InvestigationStatusBadge({ status }) {
  const value = String(status || "").toUpperCase();

  if (!value) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-muted ring-1 ring-navy-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-muted" />
        Not investigated
      </span>
    );
  }

  const styles = {
    UNDER_REVIEW:
      "bg-warn/15 text-warn ring-warn/40",
    CONFIRMED_FRAUD:
      "bg-fraud/15 text-fraud-soft ring-fraud/40",
    FALSE_POSITIVE:
      "bg-accent/15 text-accent-soft ring-accent/40",
    CONFIRMED_LEGITIMATE:
      "bg-legit/15 text-legit-soft ring-legit/40",
  };

  const labels = {
    UNDER_REVIEW: "Under Review",
    CONFIRMED_FRAUD: "Confirmed Fraud",
    FALSE_POSITIVE: "False Positive",
    CONFIRMED_LEGITIMATE: "Confirmed Legitimate",
  };

  const dots = {
    UNDER_REVIEW: "bg-warn",
    CONFIRMED_FRAUD: "bg-fraud",
    FALSE_POSITIVE: "bg-accent",
    CONFIRMED_LEGITIMATE: "bg-legit",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${
        styles[value] || "bg-navy-800 text-slate-muted ring-navy-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[value] || "bg-slate-muted"}`} />
      {labels[value] || value}
    </span>
  );
}

export default InvestigationStatusBadge;
