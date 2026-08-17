import { StatusDot } from "./Hud";

function SystemStatus({ health, loading, error }) {
  const ml = health?.ml_service === "connected";
  const api = health?.backend === "running" || health?.status === "healthy";
  const db = health?.database === "connected";
  const monitor = ml && api && db;

  return (
    <section className="panel rounded-xl px-4 py-4 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-muted">
        System Status
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-slate-soft">Checking services…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-fraud-soft">Status unavailable — {error}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <StatusDot online={ml} label="ML Engine Online" />
          <StatusDot online={Boolean(api)} label="API Online" />
          <StatusDot online={db} label="Database Online" />
          <StatusDot online={monitor} label="Threat Monitor Active" />
        </div>
      )}
    </section>
  );
}

export default SystemStatus;
