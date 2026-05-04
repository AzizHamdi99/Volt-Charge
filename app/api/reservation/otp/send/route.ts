import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/libs/apiAuth";
import { sendReservationOtpEmail } from "@/libs/mailer";
import { connectDB } from "@/libs/mongoose";
import { ReservationOtp } from "@/models/ReservationOtp";
import { Station } from "@/models/Station";
import { User } from "@/models/User";
import { Vehicle } from "@/models/Vehicle";

const OTP_TTL_MS = 10 * 60 * 1000;

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

function hashOtp(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "";
  if (local.length <= 2) return `${local[0] ?? ""}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
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

    if (!stationId || !vehicleId || !date || !slotStart || !slotEnd || !slotLabel) {
      return NextResponse.json(
        { error: "Missing or invalid reservation fields" },
        { status: 400 },
      );
    }

    await connectDB();

    const [station, vehicle, user] = await Promise.all([
      Station.findById(stationId).select("name status"),
      Vehicle.findOne({ _id: vehicleId, ownerId: session?.keycloakId }).select("_id"),
      User.findOne({ keycloakId: session?.keycloakId }).select("email"),
    ]);

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }
    if (station.status === "offline") {
      return NextResponse.json({ error: "Station is offline" }, { status: 409 });
    }
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (!user?.email) {
      return NextResponse.json(
        { error: "No email found for the current user" },
        { status: 400 },
      );
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await ReservationOtp.findOneAndUpdate(
      {
        userId: session?.keycloakId,
        stationId,
        vehicleId,
        date,
        slotLabel,
        usedAt: null,
      },
      {
        $set: {
          email: user.email,
          slotStart,
          slotEnd,
          codeHash: hashOtp(otp),
          expiresAt,
          attempts: 0,
          usedAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await sendReservationOtpEmail(user.email, otp, {
      stationName: station.name,
      date,
      slotLabel,
    });

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
      email: maskEmail(user.email),
      expiresInSeconds: OTP_TTL_MS / 1000,
    });
  } catch (caughtError: unknown) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
