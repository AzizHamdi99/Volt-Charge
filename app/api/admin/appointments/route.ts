import { NextResponse } from "next/server";
import { requireAdminApi } from "@/libs/apiAuth";
import { connectDB } from "@/libs/mongoose";
import { Reservation } from "@/models/Reservation";
import { User } from "@/models/User";

type RawReservation = {
  _id: unknown;
  userId: string;
  stationId:
    | string
    | {
        _id?: unknown;
        name?: string;
        address?: string;
      };
  vehicleId:
    | string
    | {
        _id?: unknown;
        fullName?: string;
        licensePlate?: string;
        year?: string;
      };
  date: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  rate: number;
  durationMinutes: number;
  status: "confirmed" | "cancelled" | "completed";
  createdAt?: Date;
  updatedAt?: Date;
};

function toIsoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  await connectDB();

  const reservations = await Reservation.find({})
    .populate("stationId", "name address")
    .populate("vehicleId", "fullName licensePlate year")
    .sort({ date: -1, slotStart: -1, createdAt: -1 })
    .lean<RawReservation[]>();

  const userIds = Array.from(new Set(reservations.map((item) => item.userId)));
  const users = await User.find({ keycloakId: { $in: userIds } })
    .select("keycloakId name email role")
    .lean();

  const usersByKeycloakId = new Map(
    users.map((user) => [user.keycloakId, user]),
  );

  const appointments = reservations.map((reservation) => {
    const station = reservation.stationId;
    const vehicle = reservation.vehicleId;
    const user = usersByKeycloakId.get(reservation.userId);

    return {
      _id: String(reservation._id),
      id: String(reservation._id),
      userId: reservation.userId,
      date: reservation.date,
      slotLabel: reservation.slotLabel,
      slotStart: reservation.slotStart,
      slotEnd: reservation.slotEnd,
      rate: reservation.rate,
      durationMinutes: reservation.durationMinutes,
      status: reservation.status,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      user: user
        ? {
            keycloakId: user.keycloakId,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        : null,
      station:
        station && typeof station === "object" && station._id
          ? {
              _id: String(station._id),
              id: String(station._id),
              name: station.name ?? "Unknown station",
              address: station.address ?? "",
            }
          : null,
      vehicle:
        vehicle && typeof vehicle === "object" && vehicle._id
          ? {
              _id: String(vehicle._id),
              id: String(vehicle._id),
              fullName: vehicle.fullName ?? "Unknown vehicle",
              licensePlate: vehicle.licensePlate ?? "",
              year: vehicle.year ?? "",
            }
          : null,
    };
  });

  const today = toIsoDateOnly(new Date());

  const summary = {
    totalAppointments: appointments.length,
    upcoming: appointments.filter(
      (item) => item.status === "confirmed" && item.date >= today,
    ).length,
    completedToday: appointments.filter(
      (item) => item.status === "completed" && item.date === today,
    ).length,
  };

  return NextResponse.json({ summary, appointments });
}
