import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Transactions from "./pages/Transactions";
import TransactionDetails from "./pages/TransactionDetails";
import ModelPerformance from "./pages/ModelPerformance";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import AdminUsers from "./pages/AdminUsers";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import CustomCursor from "./components/CustomCursor";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-sm text-slate-soft">
        Initializing command center…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen min-w-0 bg-navy-950 text-ice">
      <CustomCursor />
      <div className="pointer-events-none fixed inset-0 hud-grid opacity-70" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_12%,transparent),_transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 hud-scan" />
      <Navbar />
      <main className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <Analyze />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <ProtectedRoute>
                <TransactionDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/model-performance"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <ModelPerformance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminAuditLogs />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
