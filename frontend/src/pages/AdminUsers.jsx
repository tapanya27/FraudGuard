import { useEffect, useState } from "react";
import { formatDate } from "../utils/format";
import {
  getAdminUsers,
  updateUserRole,
  updateUserStatus,
} from "../services/api";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsers();
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(user, role) {
    setBusyId(user.id);
    setError("");
    try {
      await updateUserRole(user.id, role);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(user) {
    setBusyId(user.id);
    setError("");
    try {
      await updateUserStatus(user.id, !user.is_active);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
      <h1 className="text-2xl font-semibold text-ice sm:text-3xl">Access Control</h1>
        <p className="mt-1 text-sm text-slate-soft">
          Manage roles and account status. Password hashes are never exposed.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-fraud/40 bg-fraud/10 px-4 py-3 text-sm text-fraud-soft">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-navy-700 bg-navy-900 p-8 text-center text-sm text-slate-soft">
          Loading users…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-700 bg-navy-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-navy-700 text-left text-sm">
              <thead className="bg-navy-850 text-xs uppercase tracking-wider text-slate-muted">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-navy-850/80">
                    <td className="px-4 py-3 font-mono text-ice">#{user.id}</td>
                    <td className="px-4 py-3 text-ice">{user.name}</td>
                    <td className="px-4 py-3 text-slate-soft">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={busyId === user.id}
                        onChange={(e) => changeRole(user, e.target.value)}
                        className="rounded-md border border-navy-700 bg-navy-950 px-2 py-1 text-xs text-ice"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="ANALYST">ANALYST</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          user.is_active
                            ? "bg-legit/15 text-legit-soft"
                            : "bg-slate-muted/20 text-slate-muted"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-soft">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => toggleActive(user)}
                        className="text-xs text-accent-soft hover:text-accent disabled:opacity-50"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
