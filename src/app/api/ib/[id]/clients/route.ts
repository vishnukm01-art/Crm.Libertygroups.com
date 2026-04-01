import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requestedLevel = parseInt(_req.nextUrl.searchParams.get("level") || "1", 10);

    const ib = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, isIB: true },
    });
    if (!ib) return NextResponse.json({ error: "IB not found" }, { status: 404 });

    // Walk down the hierarchy to find users at the requested level
    // Level 1 = direct children of this IB
    // Level 2 = children of Level 1 users, etc.
    let currentParentIds = [params.id];
    for (let depth = 1; depth < requestedLevel; depth++) {
      const nextLevel = await prisma.user.findMany({
        where: { ibParentId: { in: currentParentIds } },
        select: { id: true },
      });
      currentParentIds = nextLevel.map((u) => u.id);
      if (currentParentIds.length === 0) break;
    }

    // Fetch users at the requested level
    const clients = currentParentIds.length > 0
      ? await prisma.user.findMany({
          where: { ibParentId: { in: currentParentIds } },
          select: {
            id: true, name: true, email: true, phone: true,
            mt5Account: true, totalCommission: true, walletBalance: true,
            isIB: true, status: true,
            createdAt: true,
            ibParent: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    // Get all descendants for stats (total members across all levels)
    const getAllDescendantIds = async (rootId: string): Promise<string[]> => {
      const allIds: string[] = [];
      let parents = [rootId];
      for (let d = 0; d < 10 && parents.length > 0; d++) {
        const children = await prisma.user.findMany({
          where: { ibParentId: { in: parents } },
          select: { id: true },
        });
        const childIds = children.map((c) => c.id);
        allIds.push(...childIds);
        parents = childIds;
      }
      return allIds;
    };

    const allDescendantIds = await getAllDescendantIds(params.id);

    const deposits = await prisma.transaction.aggregate({
      where: { userId: { in: allDescendantIds.length > 0 ? allDescendantIds : ["_none_"] }, type: "deposit", status: "completed" },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.transaction.aggregate({
      where: { userId: { in: allDescendantIds.length > 0 ? allDescendantIds : ["_none_"] }, type: "withdraw", status: "completed" },
      _sum: { amount: true },
    });

    // Count how many levels exist
    let maxLevel = 0;
    let checkParents = [params.id];
    for (let d = 0; d < 20 && checkParents.length > 0; d++) {
      const nextChildren = await prisma.user.findMany({
        where: { ibParentId: { in: checkParents } },
        select: { id: true },
      });
      if (nextChildren.length > 0) {
        maxLevel = d + 1;
        checkParents = nextChildren.map((c) => c.id);
      } else {
        break;
      }
    }

    return NextResponse.json({
      ib: { id: ib.id, name: ib.name },
      maxLevel,
      stats: {
        totalMembers: allDescendantIds.length,
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
        isIB: c.isIB,
        status: c.status,
        ibName: c.ibParent?.name || null,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("IB clients error:", error);
    return NextResponse.json({ error: "Failed to fetch IB clients" }, { status: 500 });
  }
}
