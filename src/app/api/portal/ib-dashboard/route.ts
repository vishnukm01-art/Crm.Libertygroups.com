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

    // Get direct referrals (children under this IB)
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

    // Get recent commission shares from audit log
    const recentShares = await prisma.auditLog.findMany({
      where: {
        adminId: userId,
        action: { in: ["IB_PORTAL_COMMISSION_SHARE", "IB_COMMISSION_SHARE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, details: true, entityId: true, createdAt: true },
    });

    return NextResponse.json({
      ib: {
        name: user.name,
        email: user.email,
        referralLink: user.referralLink,
        totalCommission: user.totalCommission,
        availableCommission: user.availableCommission,
      },
      stats: {
        totalReferrals: referrals.length,
        activeReferrals,
      },
      referrals,
      recentShares,
    });
  } catch (error) {
    console.error("IB dashboard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch IB dashboard" }, { status: 500 });
  }
}
