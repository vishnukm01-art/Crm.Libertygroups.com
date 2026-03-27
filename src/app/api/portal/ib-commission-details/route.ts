import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true, totalCommission: true, availableCommission: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Get commission configuration
    const commissionConfig = await prisma.iBCommission.findMany({
      where: { ibUserId: userId },
      orderBy: { level: "asc" },
    });

    // Get commission-related audit logs as earning history
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        adminId: userId,
        action: { contains: "commission" },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Get IB withdrawal history
    const ibWithdrawals = await prisma.transaction.findMany({
      where: {
        userId,
        type: "ib_withdraw",
        status: { in: ["approved", "completed"] },
      },
      select: { amount: true },
    });

    const totalWithdrawn = ibWithdrawals.reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      totalCommission: user.totalCommission,
      availableCommission: user.availableCommission,
      totalWithdrawn,
      commissionConfig,
      history: auditLogs,
    });
  } catch (error) {
    console.error("Fetch IB commission details error:", error);
    return NextResponse.json({ error: "Failed to fetch commission details" }, { status: 500 });
  }
}
