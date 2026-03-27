import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ib = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, isIB: true },
    });
    if (!ib) return NextResponse.json({ error: "IB not found" }, { status: 404 });

    const clients = await prisma.user.findMany({
      where: { ibParentId: params.id },
      select: {
        id: true, name: true, email: true, phone: true,
        mt5Account: true, totalCommission: true, walletBalance: true,
        createdAt: true,
        ibParent: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const deposits = await prisma.transaction.aggregate({
      where: { userId: { in: clients.map((c) => c.id) }, type: "deposit", status: "completed" },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.transaction.aggregate({
      where: { userId: { in: clients.map((c) => c.id) }, type: "withdraw", status: "completed" },
      _sum: { amount: true },
    });

    return NextResponse.json({
      ib: { id: ib.id, name: ib.name },
      stats: {
        totalMembers: clients.length,
        totalInvestment: deposits._sum.amount || 0,
        totalWithdraw: withdrawals._sum.amount || 0,
      },
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        mt5Account: c.mt5Account,
        totalCommission: c.totalCommission,
        ibName: c.ibParent?.name || null,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("IB clients error:", error);
    return NextResponse.json({ error: "Failed to fetch IB clients" }, { status: 500 });
  }
}
