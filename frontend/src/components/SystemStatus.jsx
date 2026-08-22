import { StatusDot } from "./Hud";

function isOnline(value) {
  return value === "online" || value === "connected" || value === "running";
}

function SystemStatus({ health, loading, error }) {
  const api = isOnline(health?.api) || isOnline(health?.backend);
  const db = isOnline(health?.database);
  const ml = isOnline(health?.ml) || isOnline(health?.ml_service);
  const monitor = ml && api && db;

  return (
    <section className="panel rounded-xl px-4 py-4 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-muted">
        System Status
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-slate-soft">Checking services…</p>
      ) : error && !health ? (
        <p className="mt-3 text-sm text-fraud-soft">Status unavailable — {error}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <StatusDot online={Boolean(api)} label="API Online" />
            <StatusDot online={db} label="Database Online" />
            <StatusDot online={ml} label="ML Engine Online" alertWhenOffline />
            <StatusDot online={monitor} label="Threat Monitor Active" />
          </div>
          {api && db && !ml ? (
            <p className="mt-2 text-xs text-slate-muted">
              ML engine is sleeping or unreachable. Analyze may take up to a minute on the first request.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

export default SystemStatus;
