import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/libs/apiAuth";
import { connectDB } from "@/libs/mongoose";
import { Reservation } from "@/models/Reservation";

type Ctx = { params: { id?: string } | Promise<{ id?: string }> };

function isPromise<T>(value: unknown): value is Promise<T> {
  if (typeof value !== "object" || value === null) return false;
  const maybe = value as { then?: unknown };
  return typeof maybe.then === "function";
}

async function getIdFromCtx(ctx: Ctx) {
  const resolved = isPromise<{ id?: string }>(ctx.params)
    ? await ctx.params
    : ctx.params;
  return typeof resolved.id === "string" ? resolved.id.trim() : "";
}

function toReservationDto(raw: any) {
  const reservation =
    typeof raw.toObject === "function" ? raw.toObject() : raw;

  const station = reservation.stationId;
  const vehicle = reservation.vehicleId;

  return {
    _id: String(reservation._id),
    id: String(reservation._id),
    userId: reservation.userId,
    stationId:
      station && typeof station === "object" && station._id
        ? String(station._id)
        : String(reservation.stationId),
    vehicleId:
      vehicle && typeof vehicle === "object" && vehicle._id
        ? String(vehicle._id)
        : String(reservation.vehicleId),
    date: reservation.date,
    slotLabel: reservation.slotLabel,
    slotStart: reservation.slotStart,
    slotEnd: reservation.slotEnd,
    rate: reservation.rate,
    durationMinutes: reservation.durationMinutes,
    status: reservation.status,
    station:
      station && typeof station === "object" && station._id
        ? {
            _id: String(station._id),
            id: String(station._id),
            name: station.name,
            address: station.address,
            rate: station.rate,
          }
        : null,
    vehicle:
      vehicle && typeof vehicle === "object" && vehicle._id
        ? {
            _id: String(vehicle._id),
            id: String(vehicle._id),
            fullName: vehicle.fullName,
            licensePlate: vehicle.licensePlate,
            year: vehicle.year,
          }
        : null,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const { session, error } = await requireSessionApi();
  if (error) return error;

  const id = await getIdFromCtx(ctx);
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await connectDB();

  const reservation = await Reservation.findOne({
    _id: id,
    userId: session?.keycloakId,
  })
    .populate("stationId", "name address rate")
    .populate("vehicleId", "fullName licensePlate year");

  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(toReservationDto(reservation));
}
