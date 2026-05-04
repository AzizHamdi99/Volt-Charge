import { NextResponse } from "next/server";
import { requireAdminApi } from "@/libs/apiAuth";
import { connectDB } from "@/libs/mongoose";
import { Reservation } from "@/models/Reservation";
import { User } from "@/models/User";
import { Vehicle } from "@/models/Vehicle";

type CountRow = {
  _id: string;
  count: number;
};

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  await connectDB();

  const [users, reservationCountsRaw, vehicleCountsRaw] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).lean(),
    Reservation.aggregate<CountRow>([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    Vehicle.aggregate<CountRow>([
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]),
  ]);

  const reservationCountByUser = new Map<string, number>(
    reservationCountsRaw.map((row) => [row._id, row.count]),
  );
  const vehicleCountByUser = new Map<string, number>(
    vehicleCountsRaw.map((row) => [row._id, row.count]),
  );

  const dto = users.map((user) => ({
    _id: String(user._id),
    id: String(user._id),
    keycloakId: user.keycloakId,
    name: user.name,
    email: user.email,
    role: user.role,
    reservationCount: reservationCountByUser.get(user.keycloakId) ?? 0,
    vehicleCount: vehicleCountByUser.get(user.keycloakId) ?? 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const summary = {
    totalUsers: dto.length,
    adminAccounts: dto.filter((user) => user.role === "admin").length,
    newThisWeek: dto.filter((user) => {
      const createdAt = new Date(user.createdAt).getTime();
      return Number.isFinite(createdAt) && createdAt >= weekAgo;
    }).length,
  };

  return NextResponse.json({ summary, users: dto });
}