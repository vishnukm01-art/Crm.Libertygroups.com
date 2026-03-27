import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mt5Account: true },
    });

    if (!user || !user.mt5Account) {
      return NextResponse.json([]);
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    // Try to use the MT5 API for live data
    try {
      const { mt5GetTrades } = await import("@/lib/mt5");
      const trades = await mt5GetTrades(user.mt5Account, from || undefined, to || undefined);
      return NextResponse.json(trades || []);
    } catch {
      // If MT5 is unavailable, return empty
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Fetch deals error:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}
