import { useEffect, useState } from "react";
import TransactionTable from "../components/TransactionTable";
import { getTransactions } from "../services/api";
import { ErrorBanner, FilterChip } from "../components/Hud";

const PREDICTION_FILTERS = [
  { id: "all", label: "All", prediction: undefined },
  { id: "fraud", label: "Fraud", prediction: 1 },
  { id: "legitimate", label: "Legitimate", prediction: 0 },
];

const RISK_FILTERS = [
  { id: "all", label: "All Risk" },
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
];

const INVESTIGATION_FILTERS = [
  { id: "all", label: "All Investigations" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "CONFIRMED_FRAUD", label: "Confirmed Fraud" },
  { id: "FALSE_POSITIVE", label: "False Positive" },
  { id: "CONFIRMED_LEGITIMATE", label: "Confirmed Legitimate" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "probability_desc", label: "Probability ↓" },
  { id: "probability_asc", label: "Probability ↑" },
];

function Transactions() {
  const [predictionFilter, setPredictionFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [investigationFilter, setInvestigationFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [searchId, setSearchId] = useState("");
  const [appliedId, setAppliedId] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const limit = 20;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const prediction = PREDICTION_FILTERS.find(
          (item) => item.id === predictionFilter
        )?.prediction;

        const response = await getTransactions(page, limit, {
          prediction,
          risk_level: riskFilter === "all" ? undefined : riskFilter,
          investigation_status:
            investigationFilter === "all" ? undefined : investigationFilter,
          id: appliedId || undefined,
          sort,
        });

        if (cancelled) return;

        setRows(response.data || []);
        setPagination(
          response.pagination || {
            page,
            limit,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [predictionFilter, riskFilter, investigationFilter, sort, appliedId, page]);

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedId(searchId.trim());
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
          Case Database
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ice sm:text-3xl">
          Stored threat cases
        </h1>
        <p className="mt-1 text-sm text-slate-muted">
          Prediction history with analyst investigation status from PostgreSQL.
        </p>
      </div>

      <form onSubmit={applySearch} className="flex flex-wrap gap-2">
        <input
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Search Case ID…"
          className="min-w-0 flex-1 rounded-md border border-navy-700 bg-navy-950 px-3 py-2 text-sm text-ice outline-none focus:border-accent/60"
        />
        <button
          type="submit"
          className="rounded-md bg-navy-800 px-4 py-2 text-sm text-ice ring-1 ring-navy-600"
        >
          Search
        </button>
        {appliedId ? (
          <button
            type="button"
            onClick={() => {
              setSearchId("");
              setAppliedId("");
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-sm text-slate-soft hover:text-ice"
          >
            Clear
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {PREDICTION_FILTERS.map((item) => (
          <FilterChip
            key={item.id}
            active={predictionFilter === item.id}
            onClick={() => {
              setPredictionFilter(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {RISK_FILTERS.map((item) => (
          <FilterChip
            key={item.id}
            tone="warn"
            active={riskFilter === item.id}
            onClick={() => {
              setRiskFilter(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {INVESTIGATION_FILTERS.map((item) => (
          <FilterChip
            key={item.id}
            active={investigationFilter === item.id}
            onClick={() => {
              setInvestigationFilter(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-slate-muted">
          Sort
        </span>
        {SORT_OPTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSort(item.id);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              sort === item.id
                ? "bg-navy-800 text-ice ring-1 ring-accent/40"
                : "bg-navy-900 text-slate-soft ring-1 ring-navy-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBanner>{error}</ErrorBanner>
      ) : null}

      <TransactionTable
        rows={rows}
        loading={loading}
        emptyMessage="No transactions match this filter."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-soft">
        <p>
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ·{" "}
          {pagination.total} total
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

export default Transactions;
