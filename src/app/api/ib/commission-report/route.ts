import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59");

    const commissions = await prisma.iBCommission.findMany({
      where: from || to ? { createdAt: dateFilter } : undefined,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with IB user info
    const ibUserIds = Array.from(new Set(commissions.map((c) => c.ibUserId)));
    const ibUsers = await prisma.user.findMany({
      where: { id: { in: ibUserIds } },
      select: {
        id: true, name: true, email: true, totalCommission: true,
        availableCommission: true, _count: { select: { ibChildren: true } },
      },
    });

    const userMap = new Map(ibUsers.map((u) => [u.id, u]));

    const result = commissions.map((c) => {
      const user = userMap.get(c.ibUserId);
      return {
        id: c.id,
        ibUserId: c.ibUserId,
        ibName: user?.name || "Unknown",
        ibEmail: user?.email || "",
        level: c.level,
        commissionType: c.commissionType,
        value: c.value,
        groupName: c.groupName,
        totalClients: user?._count?.ibChildren || 0,
        totalCommission: user?.totalCommission || 0,
        availableCommission: user?.availableCommission || 0,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch IB commission report" }, { status: 500 });
  }
}
