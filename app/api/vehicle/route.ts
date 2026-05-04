import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

import { NextRequest, NextResponse } from "next/server";
import { getVehiclesByOwner } from "@/services/vehicles/getVehicles";
import { createVehicle } from "@/services/vehicles/createVehicle";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await getVehiclesByOwner(session.keycloakId);
  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Basic validation (schema also enforces required fields).
    const required = [
      "licensePlate",
      "vin",
      "fullName",
      "make",
      "model",
      "year",
      "fuelType",
    ] as const;
    for (const key of required) {
      const v = body?.[key];
      if (typeof v !== "string" || v.trim() === "") {
        return NextResponse.json(
          { error: `Missing or invalid field: ${key}` },
          { status: 400 }
        );
      }
    }

    const vehicle = await createVehicle({
      ...body,
      ownerId: session.keycloakId,
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    const status = message === "Vehicle already exists" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}