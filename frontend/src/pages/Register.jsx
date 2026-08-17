import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { register as apiRegister } from "../services/api";
import {
  getPasswordRequirementState,
  isValidEmail,
} from "../utils/authValidation";

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6" />
        <path d="M9.9 5.1A10.5 10.5 0 0121 12c-.7 1.2-1.6 2.3-2.7 3.2M6.1 6.1C4.4 7.4 3 9.1 2 12c1.8 4.5 6 7.5 10 7.5 1.5 0 3-.3 4.4-.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
        {label}
      </span>
      <span className="relative block">
        <input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-navy-700 bg-navy-950 py-2 pl-3 pr-11 text-sm text-ice outline-none focus:border-accent/60"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 px-3 text-slate-muted hover:text-ice"
          aria-label={show ? "Hide password" : "Show password"}
        >
          <EyeIcon open={show} />
        </button>
      </span>
    </label>
  );
}

function Requirement({ ok, label }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-legit-soft" : "text-slate-muted"}`}>
      <span aria-hidden="true">{ok ? "✓" : "○"}</span>
      <span>{label}</span>
    </li>
  );
}

function Register() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requirements = useMemo(
    () => getPasswordRequirementState(password),
    [password]
  );
  const allRequirementsMet = Object.values(requirements).every(Boolean);
  const emailError =
    emailTouched && !isValidEmail(email)
      ? "Please enter a valid email address."
      : "";
  const confirmError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? "Passwords do not match."
      : "";

  const canSubmit =
    Boolean(name.trim()) &&
    isValidEmail(email) &&
    allRequirementsMet &&
    password === confirmPassword &&
    confirmPassword.length > 0 &&
    !submitting;

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setEmailTouched(true);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!allRequirementsMet) {
      if (!requirements.minLength) {
        setError("Password must be at least 8 characters.");
      } else if (!requirements.uppercase) {
        setError("Password must contain at least one uppercase letter.");
      } else if (!requirements.lowercase) {
        setError("Password must contain at least one lowercase letter.");
      } else if (!requirements.number) {
        setError("Password must contain at least one number.");
      } else {
        setError("Password must contain at least one special character.");
      }
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRegister(name.trim(), email.trim(), password, confirmPassword);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="panel rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-wide text-ice">
          Create Analyst Account
        </h1>
        <p className="mt-1 text-sm text-slate-muted">
          Public registration creates an ANALYST role. Admins are seeded separately.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <label className="block text-sm">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-sm text-ice outline-none focus:border-accent/60"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
              Email
            </span>
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-sm text-ice outline-none focus:border-accent/60"
            />
            {emailError ? (
              <p className="mt-1.5 text-xs text-fraud-soft">{emailError}</p>
            ) : null}
          </label>

          <div>
            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-muted">
              Password must contain
            </p>
            <ul className="mt-2 space-y-1">
              <Requirement ok={requirements.minLength} label="At least 8 characters" />
              <Requirement ok={requirements.uppercase} label="1 uppercase letter" />
              <Requirement ok={requirements.lowercase} label="1 lowercase letter" />
              <Requirement ok={requirements.number} label="1 number" />
              <Requirement ok={requirements.special} label="1 special character" />
            </ul>
          </div>

          <div>
            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />
            {confirmError ? (
              <p className="mt-1.5 text-xs text-fraud-soft">{confirmError}</p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-fraud/40 bg-fraud/10 px-3 py-2 text-sm text-fraud-soft">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary w-full rounded-md px-4 py-2.5 text-sm disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-accent-soft hover:text-accent">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
