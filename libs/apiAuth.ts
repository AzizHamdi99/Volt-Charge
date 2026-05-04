import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { NextResponse } from "next/server";

export async function requireSessionApi() {
  const session = await getServerSession(authOptions);

  if (!session?.keycloakId) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}

export async function requireAdminApi() {
  const { session, error } = await requireSessionApi();
  if (error) return { session: null, error };

  if (session?.role !== "admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}
