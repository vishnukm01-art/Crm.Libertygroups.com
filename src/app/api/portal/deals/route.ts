import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all MT5 accounts for this user
    const mt5Accounts = await prisma.mt5Account.findMany({
      where: { userId },
      select: { mt5Login: true },
      orderBy: { isDefault: "desc" },
    });

    // Fallback to legacy single-account field on User
    if (mt5Accounts.length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mt5Account: true },
      });
      if (user?.mt5Account) {
        mt5Accounts.push({ mt5Login: user.mt5Account });
      }
    }

    if (mt5Accounts.length === 0) {
      return NextResponse.json([]);
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    // Fetch trades for all MT5 accounts in parallel
    try {
      const { mt5GetTrades } = await import("@/lib/mt5");
      const allTrades = await Promise.all(
        mt5Accounts.map(async (acc) => {
          const result = await mt5GetTrades(acc.mt5Login, from || undefined, to || undefined);
          return result.data || [];
        })
      );
      return NextResponse.json(allTrades.flat());
    } catch {
      // If MT5 is unavailable, return empty
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Fetch deals error:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}
