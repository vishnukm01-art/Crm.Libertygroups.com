import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processTradeCommission } from "@/lib/commission-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/ib/trade-sync
 * Process trades and distribute commissions.
 * Called periodically or after trade close events from MT5.
 * 
 * Body: { trades: [{ tradeId, mt5Login, volume, groupName }] }
 * Or single: { tradeId, mt5Login, volume, groupName }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const trades = Array.isArray(body.trades) ? body.trades : [body];

    const results = [];

    for (const trade of trades) {
      const { tradeId, mt5Login, volume, groupName } = trade;

      if (!tradeId || !mt5Login || volume === undefined) {
        results.push({ tradeId, error: "Missing tradeId, mt5Login, or volume" });
        continue;
      }

      // Find the user by MT5 login
      const mt5Account = await prisma.mt5Account.findFirst({
        where: { mt5Login: String(mt5Login) },
        select: { userId: true, mt5Group: true },
      });

      if (!mt5Account) {
        // Try legacy mt5Account field on User
        const legacyUser = await prisma.user.findFirst({
          where: { mt5Account: String(mt5Login) },
          select: { id: true, mt5Group: true },
        });

        if (!legacyUser) {
          results.push({ tradeId, error: `No user found for MT5 login ${mt5Login}` });
          continue;
        }

        const group = groupName || legacyUser.mt5Group || "Smart";
        const lots = parseFloat(volume);

        const commissions = await processTradeCommission(
          String(tradeId),
          String(mt5Login),
          legacyUser.id,
          group,
          lots
        );

        results.push({ tradeId, processed: true, commissions });
        continue;
      }

      const group = groupName || mt5Account.mt5Group || "Smart";
      const lots = parseFloat(volume);

      const commissions = await processTradeCommission(
        String(tradeId),
        String(mt5Login),
        mt5Account.userId,
        group,
        lots
      );

      results.push({ tradeId, processed: true, commissions });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Trade sync error:", error);
    return NextResponse.json({ error: "Failed to process trades" }, { status: 500 });
  }
}

/**
 * GET /api/ib/trade-sync
 * Get recent commission ledger entries
 */
export async function GET(req: NextRequest) {
  try {
    const ibId = req.nextUrl.searchParams.get("ibId");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    const where = ibId ? { ibUserId: ibId } : {};

    const entries = await prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Enrich with user names
    const userIds = [...new Set(entries.map((e) => e.ibUserId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = entries.map((e) => ({
      ...e,
      ibName: userMap[e.ibUserId]?.name || "Unknown",
      ibEmail: userMap[e.ibUserId]?.email || "",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Commission ledger fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
