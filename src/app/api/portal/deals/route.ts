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
      const loginSet = new Set(mt5Accounts.map((a) => a.mt5Login));
      const allTrades = await Promise.all(
        mt5Accounts.map(async (acc) => {
          const result = await mt5GetTrades(acc.mt5Login, from || undefined, to || undefined);
          return result.data || [];
        })
      );
      // Only include deals that belong to this user's MT5 accounts
      const flatTrades = allTrades.flat().filter(
        (t) => !t.login || loginSet.has(t.login)
      );

      // Fire-and-forget: auto-process IB commissions for buy/sell trades
      processTradesForCommission(flatTrades, userId).catch((err) =>
        console.error("Background commission processing error:", err)
      );

      return NextResponse.json(flatTrades);
    } catch {
      // If MT5 is unavailable, return empty
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Fetch deals error:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

/**
 * Process fetched trades for IB commission distribution (fire-and-forget).
 * Only processes buy/sell trades. Skips balance/credit operations.
 * Commission engine is idempotent — already-processed trades are skipped.
 */
async function processTradesForCommission(
  trades: Array<{ order?: string; action?: string; volume?: number; login?: string; symbol?: string }>,
  tradingUserId: string
) {
  const { processTradeCommission } = await import("@/lib/commission-engine");

  // Get the user's MT5 group name for commission lookup
  const user = await prisma.user.findUnique({
    where: { id: tradingUserId },
    select: { ibParentId: true, mt5Account: true },
  });

  // Only process if this user has an IB parent (i.e., is under an IB)
  if (!user?.ibParentId) return;

  // Determine the user's group from their MT5 account record
  const mt5Account = await prisma.mt5Account.findFirst({
    where: { userId: tradingUserId },
    select: { mt5Group: true, mt5Login: true },
    orderBy: { isDefault: "desc" },
  });

  const groupName = mt5Account?.mt5Group || "";
  if (!groupName) return; // Can't calculate commission without group

  // Filter to buy/sell trades only (skip balance, credit operations)
  const actionableTrades = trades.filter((t) => {
    const action = (t.action || "").toLowerCase();
    return action === "buy" || action === "sell" || action === "0" || action === "1";
  });

  for (const trade of actionableTrades) {
    const tradeId = trade.order || "";
    const mt5Login = trade.login || mt5Account?.mt5Login || "";
    const volume = trade.volume || 0;

    if (!tradeId || volume <= 0) continue;

    try {
      await processTradeCommission(tradeId, mt5Login, tradingUserId, groupName, volume);
    } catch (err) {
      console.error(`Commission processing failed for trade ${tradeId}:`, err);
    }
  }
}
