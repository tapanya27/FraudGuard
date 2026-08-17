function RiskBadge({ risk, prediction }) {
  const level = String(risk || "").toUpperCase();
  const isFraud = Number(prediction) === 1;

  let classes =
    "bg-navy-800 text-slate-soft ring-navy-600";
  let label = level || "UNKNOWN";

  if (isFraud || level === "HIGH") {
    classes = "bg-fraud/15 text-fraud-soft ring-fraud/40";
  } else if (level === "MEDIUM") {
    classes = "bg-warn/15 text-warn ring-warn/40";
  } else if (level === "LOW" || (!isFraud && prediction !== undefined)) {
    classes = "bg-legit/15 text-legit-soft ring-legit/40";
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${classes}`}
    >
      {label}
    </span>
  );
}

export function PredictionBadge({ prediction }) {
  const isFraud = Number(prediction) === 1;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${
        isFraud
          ? "bg-fraud/15 text-fraud-soft ring-fraud/40"
          : "bg-legit/15 text-legit-soft ring-legit/40"
      }`}
    >
      {isFraud ? "FRAUD" : "LEGITIMATE"}
    </span>
  );
}

export default RiskBadge;
