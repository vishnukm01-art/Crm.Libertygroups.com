import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const type = request.nextUrl.searchParams.get("type"); // "deposit" or "withdraw"
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    // Get direct referral IDs
    const referrals = await prisma.user.findMany({
      where: { ibParentId: userId },
      select: { id: true, name: true, email: true },
    });

    const referralIds = referrals.map((r) => r.id);
    const referralMap = Object.fromEntries(referrals.map((r) => [r.id, r]));

    if (referralIds.length === 0) {
      return NextResponse.json({ transactions: [], summary: { total: 0, count: 0, average: 0 } });
    }

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: referralIds },
        type: type || "deposit",
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        reference: true,
        createdAt: true,
      },
    });

    // Enrich with client names
    const enriched = transactions.map((t) => ({
      ...t,
      clientName: referralMap[t.userId]?.name || "Unknown",
      clientEmail: referralMap[t.userId]?.email || "",
    }));

    const approvedTx = enriched.filter((t) => t.status === "approved" || t.status === "completed");
    const total = approvedTx.reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      transactions: enriched,
      summary: {
        total,
        count: approvedTx.length,
        average: approvedTx.length > 0 ? total / approvedTx.length : 0,
      },
    });
  } catch (error) {
    console.error("Fetch team reports error:", error);
    return NextResponse.json({ error: "Failed to fetch team reports" }, { status: 500 });
  }
}
