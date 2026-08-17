import { Link } from "react-router-dom";
import { formatDate, formatProbability, predictionLabel } from "../utils/format";

function LiveThreatFeed({ rows }) {
  const items = Array.isArray(rows) ? rows.slice(0, 8) : [];

  return (
    <section className="panel h-full rounded-xl p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-muted">
        Live Threat Feed
      </p>
      <p className="mt-1 text-xs text-slate-muted">
        Latest stored cases from PostgreSQL
      </p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-muted">No cases in this range yet.</p>
      ) : (
        <ul className="mt-4 space-y-0">
          {items.map((row, index) => {
            const fraud = Number(row.prediction) === 1;
            return (
              <li
                key={row.id}
                className="animate-feed-in border-b border-navy-700/80 py-3 last:border-0"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <Link
                  to={`/transactions/${row.id}`}
                  className="block rounded-md px-1 py-0.5 hover:bg-navy-800/50"
                >
                  <p className="font-mono text-[11px] text-slate-muted">
                    {formatDate(row.created_at)}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ice">
                      Case #{row.id}
                    </span>
                    <span
                      className={`font-mono text-xs ${
                        fraud ? "text-fraud-soft" : "text-legit-soft"
                      }`}
                    >
                      {formatProbability(row.probability)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-muted">
                    {fraud ? "Fraud detected" : "Transaction cleared"} ·{" "}
                    {predictionLabel(row.prediction)} · {row.risk_level}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default LiveThreatFeed;
