"use client";

import { useEffect, useState } from "react";
import {
  type AdminAppointmentDto,
  type AdminAppointmentsResponse,
  getAdminAppointmentsApi,
} from "@/services/admin/adminApi";
import { CenteredSpinner } from "@/components/ui/centered-spinner";

const emptySummary: AdminAppointmentsResponse["summary"] = {
  totalAppointments: 0,
  upcoming: 0,
  completedToday: 0,
};

function statusClass(status: AdminAppointmentDto["status"]) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (status === "completed") return "bg-cyan-100 text-cyan-700";
  return "bg-rose-100 text-rose-700";
}

export default function AdminAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] =
    useState<AdminAppointmentsResponse["summary"]>(emptySummary);
  const [appointments, setAppointments] = useState<AdminAppointmentDto[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAdminAppointmentsApi();
        setSummary(response.summary);
        setAppointments(response.appointments);
      } catch (loadError) {
        console.error(loadError);
        setError("Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  if (loading) {
    return (
      <CenteredSpinner
        label="Loading appointments..."
        className="min-h-[70vh]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-600">
          Admin panel
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          Appointments
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Track all reservations across users and charging stations.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Total Appointments</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.totalAppointments}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Upcoming</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.upcoming}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Completed Today</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.completedToday}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Appointment Ledger
        </h3>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : appointments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No appointments found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    User
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Station
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Vehicle
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Slot
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-3 py-2 text-slate-900">
                      <p>{appointment.user?.name ?? "Unknown user"}</p>
                      <p className="text-xs text-slate-500">
                        {appointment.user?.email ?? appointment.userId}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <p>{appointment.station?.name ?? "Unknown station"}</p>
                      <p className="text-xs text-slate-500">
                        {appointment.station?.address ?? ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <p>
                        {appointment.vehicle?.fullName ?? "Unknown vehicle"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appointment.vehicle?.licensePlate ?? ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {appointment.date}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {appointment.slotLabel}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(
                          appointment.status,
                        )}`}
                      >
                        {appointment.status}
                      </span>
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
