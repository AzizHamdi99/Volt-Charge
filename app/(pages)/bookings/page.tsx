"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CarFront,
  Bolt,
  ListFilter,
} from "lucide-react";
import { CenteredSpinner } from "@/components/ui/centered-spinner";
import {
  getReservationsApi,
  type ReservationDto,
} from "@/services/reservations/reservationApi";

type BookingTab = "all" | "upcoming" | "past";

function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isFuture(dateIso: string, slotStart: string) {
  const value = new Date(`${dateIso}T${slotStart}:00`);
  return !Number.isNaN(value.getTime()) && value.getTime() >= Date.now();
}

function formatRelativeDay(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diff = Math.round(
    (startTarget.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;
  if (diff === -1) return "Yesterday";
  return `${Math.abs(diff)} days ago`;
}

function getStatusTone(status: ReservationDto["status"]) {
  if (status === "confirmed") {
    return "bg-cyan-100 text-cyan-700 border-cyan-200";
  }
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function BookingCard({
  booking,
  muted = false,
}: {
  booking: ReservationDto;
  muted?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all hover:shadow-md sm:px-6 ${
        muted ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-800">
            {booking.station?.name ?? "Station"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {booking.station?.address ?? ""}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusTone(
            booking.status,
          )}`}
        >
          {booking.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date
          </p>
          <p className="mt-1 flex items-center gap-2 font-medium text-slate-800">
            <Calendar size={15} className="text-cyan-600" />
            {formatDate(booking.date)}
          </p>
          <p className="mt-1 text-xs text-cyan-700">
            {formatRelativeDay(booking.date)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Slot
          </p>
          <p className="mt-1 flex items-center gap-2 font-medium text-slate-800">
            <Clock size={15} className="text-cyan-600" />
            {booking.slotLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Duration: {booking.durationMinutes} mins
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vehicle
          </p>
          <p className="mt-1 flex items-center gap-2 font-medium text-slate-800">
            <CarFront size={15} className="text-cyan-600" />
            {booking.vehicle?.fullName ?? "Vehicle"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {booking.vehicle?.licensePlate ?? ""}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <MapPin size={14} className="text-slate-400" />
          <span>{booking.station?.name ?? "Station"}</span>
        </div>

        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Bolt size={14} className="text-cyan-600" />
          <span>{booking.rate.toFixed(2)} TND/min</span>
        </div>
      </div>
    </article>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<ReservationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookingTab>("all");

  useEffect(() => {
    let alive = true;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReservationsApi();
        if (!alive) return;
        setBookings(data);
      } catch (err: unknown) {
        if (!alive) return;
        const message =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { data?: { error?: unknown } } }).response
            ?.data?.error === "string"
            ? ((err as { response?: { data?: { error?: string } } }).response
                ?.data?.error ?? "Failed to load reservations")
            : "Failed to load reservations";
        setError(message);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const upcoming: ReservationDto[] = [];
    const past: ReservationDto[] = [];

    for (const reservation of bookings) {
      if (isFuture(reservation.date, reservation.slotStart)) {
        upcoming.push(reservation);
      } else {
        past.push(reservation);
      }
    }

    return { upcoming, past };
  }, [bookings]);

  const visibleBookings = useMemo(() => {
    if (activeTab === "upcoming") return grouped.upcoming;
    if (activeTab === "past") return grouped.past;
    return [...grouped.upcoming, ...grouped.past];
  }, [activeTab, grouped.past, grouped.upcoming]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <CenteredSpinner
            label="Loading bookings..."
            className="min-h-[70vh]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-cyan-200/70 bg-linear-to-r from-cyan-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                Reservations
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-800 sm:text-4xl">
                Booking Center
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Track your charging sessions, check your upcoming slots, and
                review history.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center sm:min-w-90">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {bookings.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs text-slate-500">Upcoming</p>
                <p className="mt-1 text-xl font-bold text-cyan-700">
                  {grouped.upcoming.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs text-slate-500">Past</p>
                <p className="mt-1 text-xl font-bold text-slate-700">
                  {grouped.past.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-600">
            {error}
          </div>
        )}

        {!error && (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2">
              <div className="flex items-center gap-2 px-2 text-sm text-slate-500">
                <ListFilter size={15} />
                <span>View</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "all"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "upcoming"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("past")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "past"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Past
              </button>
            </div>

            {visibleBookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-xl font-semibold text-slate-700">
                  No bookings found
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Try another tab or create a new reservation from the map.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleBookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    muted={
                      activeTab === "past" ||
                      !isFuture(booking.date, booking.slotStart)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
