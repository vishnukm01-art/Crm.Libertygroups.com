import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Auto-sync: fix users who have role "ib" or approved IB requests but isIB is still false
    const usersToFix = await prisma.user.findMany({
      where: {
        isIB: false,
        OR: [
          { role: "ib" },
          { ibRequests: { some: { status: "approved" } } },
        ],
      },
      select: { id: true },
    });

    if (usersToFix.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: usersToFix.map((u) => u.id) } },
        data: { isIB: true, role: "ib" },
      });
    }

    const ibUsers = await prisma.user.findMany({
      where: { isIB: true },
      select: {
        id: true, name: true, email: true, phone: true, country: true,
        marketingName: true, referralLink: true, totalCommission: true,
        availableCommission: true, createdAt: true,
        ibParent: { select: { name: true } },
        _count: { select: { ibChildren: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = ibUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      country: u.country,
      ibName: u.ibParent?.name || null,
      totalCommission: u.totalCommission,
      availableCommission: u.availableCommission,
      referralLink: u.referralLink,
      marketingName: u.marketingName,
      totalClients: u._count.ibChildren,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("IB users error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
