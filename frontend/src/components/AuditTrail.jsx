import { formatDate } from "../utils/format";

const ACTION_LABELS = {
  TRANSACTION_ANALYZED: "Transaction analyzed",
  INVESTIGATION_OPENED: "Investigation opened",
  STATUS_CHANGED: "Status updated",
  NOTE_ADDED: "Analyst note added",
  INVESTIGATION_UPDATED: "Investigation updated",
};

function prettyStatus(value) {
  if (!value) return "—";
  return String(value).replace(/_/g, " ");
}

function AuditTrail({ events, loading, error }) {
  if (loading) {
    return (
      <div className="panel rounded-xl p-5 text-sm text-slate-soft">
        Loading case timeline…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-fraud/40 bg-fraud/10 px-4 py-3 text-sm text-fraud-soft">
        {error}
      </div>
    );
  }

  const items = Array.isArray(events) ? [...events].reverse() : [];

  return (
    <section className="panel rounded-xl p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ice">
        Case Timeline
      </h2>
      <p className="mt-1 text-xs text-slate-muted">
        Append-only investigation history. Records cannot be edited.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-muted">No audit events yet.</p>
      ) : (
        <ol className="mt-5 space-y-0">
          {items.map((event, index) => (
            <li key={event.id || index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                {index < items.length - 1 ? (
                  <span className="w-px flex-1 bg-accent/25" />
                ) : null}
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium uppercase tracking-wide text-ice">
                  {ACTION_LABELS[event.action] || event.action}
                </p>
                {event.action === "STATUS_CHANGED" &&
                (event.old_status || event.new_status) ? (
                  <p className="mt-0.5 text-sm text-slate-soft">
                    {prettyStatus(event.old_status)} → {prettyStatus(event.new_status)}
                  </p>
                ) : null}
                {event.notes ? (
                  <p className="mt-1 text-sm italic text-slate-muted">“{event.notes}”</p>
                ) : null}
                {event.action === "TRANSACTION_ANALYZED" &&
                event.metadata?.prediction !== undefined ? (
                  <p className="mt-0.5 text-sm text-slate-soft">
                    XGBoost → {Number(event.metadata.prediction) === 1 ? "FRAUD" : "LEGITIMATE"}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-muted">
                  {event.analyst_name || "System"} · {formatDate(event.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default AuditTrail;
