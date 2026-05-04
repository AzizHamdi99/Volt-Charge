import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/libs/mongoose";
import { Connector } from "@/models/Connector";
import { Station } from "@/models/Station";
import { requireAdminApi } from "@/libs/apiAuth";

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

export async function GET(_: NextRequest, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const id = await getIdFromCtx(ctx);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  await connectDB();
  const connector = await Connector.findById(id);
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  return NextResponse.json(connector);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const id = await getIdFromCtx(ctx);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    const body = await req.json();
    await connectDB();

    const connector = await Connector.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    return NextResponse.json(connector);
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
  const connector = await Connector.findByIdAndDelete(id);

  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  await Station.updateMany({ connectorIds: connector._id }, { $pull: { connectorIds: connector._id } });

  return NextResponse.json({ message: "Connector deleted successfully" });
}
