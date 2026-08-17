import { Link } from "react-router-dom";
import RiskBadge, { PredictionBadge } from "./RiskBadge";
import InvestigationStatusBadge from "./InvestigationStatusBadge";
import { formatDate, formatProbability } from "../utils/format";

function TransactionTable({
  rows,
  loading,
  emptyMessage = "No transactions found.",
}) {
  if (loading) {
    return (
      <div className="panel rounded-xl p-8 text-center text-sm text-slate-soft">
        Loading cases…
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="panel rounded-xl border-dashed p-8 text-center text-sm text-slate-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <Link
            key={row.id}
            to={`/transactions/${row.id}`}
            className="panel panel-hover block rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm text-ice">Case #{row.id}</p>
              <PredictionBadge prediction={row.prediction} />
            </div>
            <p className="mt-2 font-mono text-xs text-slate-muted">
              {formatProbability(row.probability)} · {row.risk_level}
            </p>
            <div className="mt-2">
              <InvestigationStatusBadge status={row.investigation_status} />
            </div>
          </Link>
        ))}
      </div>

      <div className="panel hidden overflow-hidden rounded-xl md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-navy-700 text-left text-sm">
            <thead className="bg-navy-850 text-[10px] uppercase tracking-wider text-slate-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Probability</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Investigation</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-accent/5">
                  <td className="px-4 py-3 font-mono text-ice">#{row.id}</td>
                  <td className="px-4 py-3 font-mono text-slate-soft">
                    {formatProbability(row.probability)}
                  </td>
                  <td className="px-4 py-3">
                    <PredictionBadge prediction={row.prediction} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge risk={row.risk_level} prediction={row.prediction} />
                  </td>
                  <td className="px-4 py-3">
                    <InvestigationStatusBadge status={row.investigation_status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-soft">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/transactions/${row.id}`}
                      className="text-xs font-semibold uppercase tracking-wider text-accent-soft hover:text-accent"
                    >
                      View Case
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default TransactionTable;
