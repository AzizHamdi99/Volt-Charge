"use client";

import { useEffect, useState } from "react";
import {
  type AdminUserDto,
  type AdminUsersResponse,
  getAdminUsersApi,
} from "@/services/admin/adminApi";
import { CenteredSpinner } from "@/components/ui/centered-spinner";

const emptySummary: AdminUsersResponse["summary"] = {
  totalUsers: 0,
  newThisWeek: 0,
  adminAccounts: 0,
};

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] =
    useState<AdminUsersResponse["summary"]>(emptySummary);
  const [users, setUsers] = useState<AdminUserDto[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAdminUsersApi();
        setSummary(response.summary);
        setUsers(response.users);
      } catch (loadError) {
        console.error(loadError);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  if (loading) {
    return (
      <CenteredSpinner label="Loading users..." className="min-h-[70vh]" />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-600">
          Admin panel
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Users</h2>
        <p className="mt-2 text-sm text-slate-500">
          Review all registered accounts, roles, and account activity.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Total Users</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.totalUsers}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">New This Week</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.newThisWeek}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Admin Accounts</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.adminAccounts}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          User Directory
        </h3>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Role
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Vehicles
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Appointments
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-2 text-slate-900">{user.name}</td>
                    <td className="px-3 py-2 text-slate-700">{user.email}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {user.vehicleCount}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {user.reservationCount}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
