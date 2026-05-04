import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/libs/mongoose";
import { Station } from "@/models/Station";
import { Connector } from "@/models/Connector";
import { requireAdminApi, requireSessionApi } from "@/libs/apiAuth";

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

export async function GET() {
  const { error } = await requireSessionApi();
  if (error) return error;

  await connectDB();
  const stations = await Station.find({})
    .populate("connectorIds")
    .sort({ createdAt: -1 });

  return NextResponse.json(stations.map(toStationDto));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const {
      name,
      address,
      lat,
      lng,
      status,
      connectorIds = [],
      rate = 0,
      rating = 0,
      reviews = 0,
      distance = "",
    } = body ?? {};

    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Invalid station name" }, { status: 400 });
    }
    if (typeof address !== "string" || address.trim() === "") {
      return NextResponse.json({ error: "Invalid station address" }, { status: 400 });
    }
    if (typeof lat !== "number" || Number.isNaN(lat)) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (typeof lng !== "number" || Number.isNaN(lng)) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
    }

    await connectDB();

    const station = await Station.create({
      name: name.trim(),
      address: address.trim(),
      lat,
      lng,
      status,
      connectorIds,
      rate,
      rating,
      reviews,
      distance,
      createdBy: session?.keycloakId,
    });

    if (Array.isArray(connectorIds) && connectorIds.length > 0) {
      await Connector.updateMany(
        { _id: { $in: connectorIds } },
        { $set: { stationId: station._id } },
      );
    }

    const populated = await Station.findById(station._id).populate("connectorIds");
    return NextResponse.json(toStationDto(populated), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
