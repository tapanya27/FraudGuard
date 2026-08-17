import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[74vh] max-w-md flex-col justify-center">
      <div className="panel rounded-2xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent/10 ring-1 ring-accent/30">
            <span className="font-mono text-accent-soft">◈</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-[0.12em] text-ice">
            FRAUDGUARD
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-muted">
            AI Fraud Intelligence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-navy-700 bg-navy-950 px-3 py-2.5 text-sm text-ice outline-none focus:border-accent/60"
              placeholder="you@company.com"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-navy-700 bg-navy-950 px-3 py-2.5 text-sm text-ice outline-none focus:border-accent/60"
            />
          </label>

          {error ? (
            <div className="rounded-md border border-fraud/40 bg-fraud/10 px-3 py-2 text-sm text-fraud-soft">
              {error}
            </div>
          ) : location.state?.registered ? (
            <div className="rounded-md border border-legit/40 bg-legit/10 px-3 py-2 text-sm text-legit-soft">
              Account created. Please log in.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-md px-4 py-2.5 text-sm disabled:opacity-60"
          >
            {submitting ? "Authenticating…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-muted">
          Need an analyst account?{" "}
          <Link to="/register" className="text-accent-soft hover:text-accent">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
