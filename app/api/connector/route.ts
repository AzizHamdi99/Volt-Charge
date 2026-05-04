import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/libs/mongoose";
import { Connector } from "@/models/Connector";
import { requireAdminApi } from "@/libs/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  await connectDB();

  const stationId = req.nextUrl.searchParams.get("stationId");
  const query = stationId ? { stationId } : {};

  const connectors = await Connector.find(query).sort({ createdAt: -1 });
  return NextResponse.json(connectors);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { type, speed, status = "available", stationId = null } = body ?? {};

    if (typeof type !== "string" || type.trim() === "") {
      return NextResponse.json({ error: "Invalid connector type" }, { status: 400 });
    }
    if (typeof speed !== "string" || speed.trim() === "") {
      return NextResponse.json({ error: "Invalid connector speed" }, { status: 400 });
    }

    await connectDB();

    const connector = await Connector.create({
      type: type.trim(),
      speed: speed.trim(),
      status,
      stationId,
    });

    return NextResponse.json(connector, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
