import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const period = request.nextUrl.searchParams.get("period") || "all";

    if (!userId) {
      return NextResponse.json([]);
    }

    // Find all sub-IBs (direct children) of this IB user
    const subIBs = await prisma.user.findMany({
      where: { ibParentId: userId, isIB: true },
      select: { id: true, name: true, email: true },
    });

    if (subIBs.length === 0) {
      return NextResponse.json([]);
    }

    const subIBIds = subIBs.map((s) => s.id);

    // Date filter based on period
    const dateFilter: Record<string, unknown> = {};
    if (period === "weekly") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dateFilter.gte = d;
    } else if (period === "monthly") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      dateFilter.gte = d;
    } else if (period === "yearly") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      dateFilter.gte = d;
    }

    // Get commission ledger totals per sub-IB
    const ledgers = await prisma.commissionLedger.findMany({
      where: {
        ibUserId: { in: subIBIds },
        ...(period !== "all" ? { processedAt: dateFilter } : {}),
      },
    });

    // Aggregate earnings per sub-IB
    const earningsMap = new Map<string, number>();
    ledgers.forEach((l) => {
      const current = earningsMap.get(l.ibUserId) || 0;
      earningsMap.set(l.ibUserId, current + l.totalCommission);
    });

    // Sort by earnings descending, take top 5
    const top5 = subIBs
      .map((s) => ({
        name: s.name,
        email: s.email,
        earnings: earningsMap.get(s.id) || 0,
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    return NextResponse.json(top5);
  } catch (error) {
    console.error("IB top earnings error:", error);
    return NextResponse.json([]);
  }
}
