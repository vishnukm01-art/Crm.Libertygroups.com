import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get("search") || "";
    const requestedLevel = parseInt(request.nextUrl.searchParams.get("level") || "1", 10);

    // Walk down the hierarchy to find users at the requested level
    let currentParentIds = [userId];
    for (let depth = 1; depth < requestedLevel; depth++) {
      const nextLevel = await prisma.user.findMany({
        where: { ibParentId: { in: currentParentIds } },
        select: { id: true },
      });
      currentParentIds = nextLevel.map((u) => u.id);
      if (currentParentIds.length === 0) break;
    }

    const searchFilter = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {};

    const clients = currentParentIds.length > 0
      ? await prisma.user.findMany({
          where: {
            ibParentId: { in: currentParentIds },
            ...searchFilter,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            isIB: true,
            mt5Account: true,
            walletBalance: true,
            createdAt: true,
            ibParent: { select: { name: true } },
          },
        })
      : [];

    // Count max levels
    let maxLevel = 0;
    let checkParents = [userId];
    for (let d = 0; d < 10 && checkParents.length > 0; d++) {
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

    const stats = {
      total: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      inactive: clients.filter((c) => c.status !== "active").length,
      subIBs: clients.filter((c) => c.isIB).length,
    };

    return NextResponse.json({
      clients: clients.map((c) => ({
        ...c,
        parentName: c.ibParent?.name || null,
      })),
      stats,
      maxLevel,
    });
  } catch (error) {
    console.error("Fetch IB clients error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}
