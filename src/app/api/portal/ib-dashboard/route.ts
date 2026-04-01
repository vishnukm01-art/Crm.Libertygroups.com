import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, isIB: true,
        referralLink: true, totalCommission: true, availableCommission: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.isIB) return NextResponse.json({ error: "User is not an IB" }, { status: 403 });

    const referrals = await prisma.user.findMany({
      where: { ibParentId: userId },
      select: {
        id: true, name: true, email: true, status: true,
        isIB: true, totalCommission: true, availableCommission: true,
        mt5Account: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const activeReferrals = referrals.filter((r) => r.status === "active").length;

    const recentShares = await prisma.auditLog.findMany({
      where: {
        adminId: userId,
        action: { in: ["IB_PORTAL_COMMISSION_SHARE", "IB_COMMISSION_SHARE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, details: true, entityId: true, createdAt: true },
    });

    // Monthly Commission
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCommissions = await prisma.commissionLedger.aggregate({
      where: { ibUserId: userId, processedAt: { gte: monthStart } },
      _sum: { totalCommission: true },
    });
    const monthlyCommission = monthlyCommissions._sum.totalCommission || 0;

    // Client Transaction aggregates using Transaction model
    const referralIds = referrals.map((r) => r.id);
    const clientCommission = await prisma.commissionLedger.aggregate({
      where: { ibUserId: userId },
      _sum: { totalCommission: true },
    });
    const clientDeposit = referralIds.length > 0
      ? await prisma.transaction.aggregate({
          where: { userId: { in: referralIds }, type: "deposit", status: "completed" },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } };
    const clientWithdraw = referralIds.length > 0
      ? await prisma.transaction.aggregate({
          where: { userId: { in: referralIds }, type: "withdraw", status: "completed" },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } };
    const clientLots = await prisma.commissionLedger.aggregate({
      where: { ibUserId: userId },
      _sum: { lotsTraded: true },
    });

    // Client Status
    const referralUsers = referralIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: referralIds } },
          select: { kycStatus: true, status: true, isIB: true },
        })
      : [];
    const kycCount = referralUsers.filter((u) => (u as any).kycStatus === "verified").length;
    const ftdCount = referralUsers.length;
    const liveAccountCount = referralUsers.filter((u) => u.status === "active").length;
    const activeSubIBCount = referralUsers.filter((u) => u.isIB && u.status === "active").length;

    return NextResponse.json({
      ib: {
        name: user.name,
        email: user.email,
        referralLink: user.referralLink,
        totalCommission: user.totalCommission,
        availableCommission: user.availableCommission,
      },
      stats: { totalReferrals: referrals.length, activeReferrals },
      referrals,
      recentShares,
      monthlyCommission,
      clientTransaction: {
        commission: clientCommission._sum.totalCommission || 0,
        deposit: clientDeposit._sum.amount || 0,
        withdraw: clientWithdraw._sum.amount || 0,
        lot: clientLots._sum.lotsTraded || 0,
      },
      clientStatus: {
        kyc: kycCount,
        ftd: ftdCount,
        liveAccount: liveAccountCount,
        activeSubIB: activeSubIBCount,
      },
    });
  } catch (error) {
    console.error("IB dashboard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch IB dashboard" }, { status: 500 });
  }
}
