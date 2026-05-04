import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/libs/mongoose";
import { Station } from "@/models/Station";
import { Connector } from "@/models/Connector";
import { requireAdminApi, requireSessionApi } from "@/libs/apiAuth";

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

function toStationDto(raw: any) {
  const station = typeof raw.toObject === "function" ? raw.toObject() : raw;
  const connectors = (station.connectorIds ?? []).map((connector: any) => ({
    _id: String(connector._id),
    type: connector.type,
    speed: connector.speed,
    status: connector.status,
    stationId: connector.stationId ? String(connector.stationId) : null,
    createdAt: connector.createdAt,
    updatedAt: connector.updatedAt,
  }));

  const totalCount = connectors.length;
  const availableCount = connectors.filter((c: any) => c.status === "available").length;

  return {
    _id: String(station._id),
    id: String(station._id),
    name: station.name,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    status: station.status,
    connectors,
    availableCount,
    totalCount,
    rate: station.rate,
    rating: station.rating,
    reviews: station.reviews,
    distance: station.distance,
    createdAt: station.createdAt,
    updatedAt: station.updatedAt,
  };
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const { error } = await requireSessionApi();
  if (error) return error;

  const id = await getIdFromCtx(ctx);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  await connectDB();
  const station = await Station.findById(id).populate("connectorIds");
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  return NextResponse.json(toStationDto(station));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const id = await getIdFromCtx(ctx);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    const body = await req.json();
    await connectDB();

    const existing = await Station.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const previousConnectorIds = (existing.connectorIds ?? []).map((c: any) => String(c));
    const nextConnectorIds = Array.isArray(body?.connectorIds)
      ? body.connectorIds.map((c: string) => String(c))
      : previousConnectorIds;

    const removed = previousConnectorIds.filter((c) => !nextConnectorIds.includes(c));
    const added = nextConnectorIds.filter((c) => !previousConnectorIds.includes(c));

    const station = await Station.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("connectorIds");

    if (removed.length > 0) {
      await Connector.updateMany({ _id: { $in: removed } }, { $set: { stationId: null } });
    }
    if (added.length > 0) {
      await Connector.updateMany({ _id: { $in: added } }, { $set: { stationId: id } });
    }

    return NextResponse.json(toStationDto(station));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const id = await getIdFromCtx(ctx);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  await connectDB();

  const station = await Station.findByIdAndDelete(id);
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  await Connector.updateMany({ stationId: station._id }, { $set: { stationId: null } });

  return NextResponse.json({ message: "Station deleted successfully" });
}
