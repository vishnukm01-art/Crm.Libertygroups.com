export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const ibUser = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true },
    });

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59");

    const ledgers = await prisma.commissionLedger.findMany({
      where: {
        ibUserId: id,
        ...(from || to ? { processedAt: dateFilter } : {}),
      },
      orderBy: { processedAt: "desc" },
    });

    const commissions = ledgers.map((l) => ({
      id: l.id,
      mt5Id: l.mt5Login || "-",
      date: l.processedAt ? l.processedAt.toISOString().split("T")[0] : "-",
      order: l.tradeId || "-",
      symbol: l.groupName || "-",
      price: 0, // Not stored in ledger, would need MT5 API
      profit: 0, // Not stored in ledger, would need MT5 API
      volume: l.lotsTraded,
      myCommission: l.totalCommission,
      type: l.type || "earned",
    }));

    return NextResponse.json({
      ibName: ibUser?.name || "Unknown",
      commissions,
    });
  } catch (error) {
    console.error("IB commission history error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
