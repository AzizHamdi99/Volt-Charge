import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/libs/apiAuth";
import { connectDB } from "@/libs/mongoose";
import { Reservation } from "@/models/Reservation";
import { Station } from "@/models/Station";
import { Vehicle } from "@/models/Vehicle";

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

function parseIsoDate(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "";
  return trimmed;
}

function parseTime(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return "";
  return trimmed;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireSessionApi();
  if (error) return error;

  await connectDB();

  const stationId = req.nextUrl.searchParams.get("stationId")?.trim();
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));

  if (stationId && date) {
    const bookedReservations = await Reservation.find({
      stationId,
      date,
      status: "confirmed",
    })
      .select("slotLabel")
      .lean();

    return NextResponse.json({
      bookedSlots: bookedReservations.map((row: any) => row.slotLabel),
    });
  }

  const reservations = await Reservation.find({ userId: session?.keycloakId })
    .populate("stationId", "name address rate")
    .populate("vehicleId", "fullName licensePlate year")
    .sort({ date: -1, slotStart: -1, createdAt: -1 });

  return NextResponse.json(reservations.map(toReservationDto));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSessionApi();
  if (error) return error;

  try {
    const body = await req.json();

    const stationId =
      typeof body?.stationId === "string" ? body.stationId.trim() : "";
    const vehicleId =
      typeof body?.vehicleId === "string" ? body.vehicleId.trim() : "";
    const date = parseIsoDate(body?.date);
    const slotStart = parseTime(body?.slotStart);
    const slotEnd = parseTime(body?.slotEnd);
    const slotLabel =
      typeof body?.slotLabel === "string" ? body.slotLabel.trim() : "";
    const durationMinutes =
      typeof body?.durationMinutes === "number" && body.durationMinutes > 0
        ? body.durationMinutes
        : 60;

    if (!stationId || !vehicleId || !date || !slotStart || !slotEnd || !slotLabel) {
      return NextResponse.json(
        { error: "Missing or invalid reservation fields" },
        { status: 400 },
      );
    }

    await connectDB();

    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }
    if (station.status === "offline") {
      return NextResponse.json(
        { error: "Station is offline" },
        { status: 409 },
      );
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      ownerId: session?.keycloakId,
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const reservation = await Reservation.create({
      userId: session?.keycloakId,
      stationId,
      vehicleId,
      date,
      slotLabel,
      slotStart,
      slotEnd,
      rate:
        typeof body?.rate === "number" && body.rate >= 0 ? body.rate : station.rate,
      durationMinutes,
      status: "confirmed",
    });

    const populated = await Reservation.findById(reservation._id)
      .populate("stationId", "name address rate")
      .populate("vehicleId", "fullName licensePlate year");

    return NextResponse.json(toReservationDto(populated), { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "This slot is already reserved" },
        { status: 409 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
