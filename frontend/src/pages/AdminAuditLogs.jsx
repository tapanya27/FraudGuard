import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";
import { formatDate } from "../utils/format";

function AdminAuditLogs() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getAuditLogs(page, 20);
        if (!cancelled) {
          setRows(data.data || []);
          setPagination(data.pagination || pagination);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ice sm:text-3xl">Audit</h1>
        <p className="mt-1 text-sm text-slate-soft">
          Security and activity events. Credentials are never logged.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-fraud/40 bg-fraud/10 px-4 py-3 text-sm text-fraud-soft">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-navy-700 bg-navy-900 p-8 text-center text-sm text-slate-soft">
          Loading audit logs…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-700 bg-navy-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-navy-700 text-left text-sm">
              <thead className="bg-navy-850 text-xs uppercase tracking-wider text-slate-muted">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-muted">
                      No audit events yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-navy-850/80">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-soft">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-ice">
                        {row.user_name || "—"}
                        <span className="mt-0.5 block text-xs text-slate-muted">
                          {row.user_email || `user #${row.user_id || "n/a"}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-accent-soft">
                        {row.action}
                      </td>
                      <td className="px-4 py-3 text-slate-soft">
                        {row.resource || "—"}
                        {row.resource_id ? (
                          <span className="font-mono text-xs text-slate-muted">
                            {" "}
                            #{row.resource_id}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-soft">
        <p>
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg bg-navy-900 px-3 py-2 ring-1 ring-navy-700 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={
              loading ||
              pagination.totalPages === 0 ||
              page >= pagination.totalPages
            }
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-navy-900 px-3 py-2 ring-1 ring-navy-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminAuditLogs;
