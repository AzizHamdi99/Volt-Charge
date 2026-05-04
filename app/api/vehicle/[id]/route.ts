import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

import { NextRequest, NextResponse } from "next/server";
import { getVehicleById } from "@/services/vehicles/getVehicles";
import { updateVehicle } from "@/services/vehicles/updateVehicle";
import { deleteVehicle } from "@/services/vehicles/deleteVehicle";

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
  const id = typeof resolved.id === "string" ? resolved.id.trim() : "";
  return id;
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getIdFromCtx(ctx);
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const vehicle = await getVehicleById(id, session.keycloakId);
    return NextResponse.json(vehicle);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Vehicle not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getIdFromCtx(ctx);
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const vehicle = await updateVehicle(id, session.keycloakId, body);
    return NextResponse.json(vehicle);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message === "Vehicle not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getIdFromCtx(ctx);
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const result = await deleteVehicle(id, session.keycloakId);
    return NextResponse.json(result);
  }catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message === "Vehicle not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}