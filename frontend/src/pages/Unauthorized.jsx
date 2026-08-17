import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <div className="panel mx-auto max-w-lg rounded-2xl border-fraud/40 p-8 text-center">
      <h1 className="text-2xl font-semibold text-fraud-soft">Unauthorized</h1>
      <p className="mt-2 text-sm text-slate-soft">
        You are signed in, but your role does not have access to this page.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-navy-800 px-4 py-2 text-sm text-ice ring-1 ring-navy-600"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

export default Unauthorized;
