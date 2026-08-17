import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { StatusDot } from "./Hud";
import ThemeToggle from "./ThemeToggle";

function isLinkActive(to, location) {
  const path = location.pathname;
  const hash = location.hash;

  if (to === "/#investigations") {
    return (path === "/" || path === "/dashboard") && hash === "#investigations";
  }
  if (to === "/") {
    return (path === "/" || path === "/dashboard") && hash !== "#investigations";
  }
  return path === to || path.startsWith(`${to}/`);
}

function navClass(active, stacked = false) {
  return [
    stacked
      ? "flex min-h-11 items-center rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wider"
      : "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
    active
      ? "bg-accent/10 text-accent-soft shadow-[inset_0_-2px_0_0_var(--accent)]"
      : "text-slate-soft hover:bg-navy-800/60 hover:text-ice",
  ].join(" ");
}

function MobileDrawer({ open, onClose, links, user, logout, location }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Navigation">
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/70"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside
        id="mobile-drawer"
        className="absolute right-0 top-0 flex h-full w-[min(320px,calc(100%-20px))] flex-col gap-1 overflow-y-auto border-l border-navy-700 bg-navy-900 p-4 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-muted">
            Navigation
          </p>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ice ring-1 ring-navy-700"
            aria-label="Close navigation"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mb-3 rounded-md bg-navy-850 px-3 py-3">
          <p className="truncate text-sm text-ice">{user?.name}</p>
          <p className="font-mono text-[10px] uppercase text-accent-soft">{user?.role}</p>
        </div>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={navClass(isLinkActive(link.to, location), true)}
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            onClose();
            logout();
          }}
          className="mt-4 min-h-11 rounded-md px-3 text-left text-sm font-semibold uppercase tracking-wider text-slate-soft ring-1 ring-navy-700"
        >
          Logout
        </button>
      </aside>
    </div>,
    document.body
  );
}

function Navbar() {
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "Command Center" },
    { to: "/analyze", label: "Analyze" },
    { to: "/transactions", label: "Cases" },
    { to: "/#investigations", label: "Investigations" },
  ];

  if (isAdmin) {
    links.push({ to: "/model-performance", label: "AI Performance" });
    links.push({ to: "/admin/audit-logs", label: "Audit" });
    links.push({ to: "/admin/users", label: "Access" });
  }

  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-40 border-b border-navy-700/80 bg-navy-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/login" className="flex min-w-0 items-center gap-3">
            <span className="font-mono text-accent-soft">◈</span>
            <span className="truncate text-sm font-semibold tracking-[0.14em] text-ice">
              FRAUDGUARD
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-navy-700/80 bg-navy-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="relative z-10 flex shrink-0 items-center gap-3 bg-navy-950/85 pr-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 ring-1 ring-accent/30">
              <span className="font-mono text-sm text-accent-soft" aria-hidden="true">
                ◈
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.14em] text-ice">
                FRAUDGUARD
              </p>
              <p className="hidden truncate text-[10px] uppercase tracking-[0.18em] text-slate-muted sm:block">
                AI Fraud Intelligence
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right lg:block">
              <p className="max-w-[140px] truncate text-xs font-medium text-ice">{user?.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-accent-soft">
                {user?.role}
              </p>
              <StatusDot online label="Online" />
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => logout()}
              className="hidden min-h-11 rounded-md px-3 text-xs font-semibold uppercase tracking-wider text-slate-soft ring-1 ring-navy-700 hover:text-ice md:inline-flex md:items-center"
            >
              Logout
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-lg text-ice ring-1 ring-navy-700 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-drawer"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6 md:flex lg:px-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={navClass(isLinkActive(link.to, location))}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        links={links}
        user={user}
        logout={logout}
        location={location}
      />
    </>
  );
}

export default Navbar;
