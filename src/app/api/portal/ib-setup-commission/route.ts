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

    // Get existing commission configs for this IB's sub-IBs
    const commissions = await prisma.iBCommission.findMany({
      where: { ibUserId: userId },
      orderBy: { level: "asc" },
    });

    // Get direct children who are IBs (potential sub-IBs)
    const subIBs = await prisma.user.findMany({
      where: { ibParentId: userId },
      select: { id: true, name: true, email: true, isIB: true },
    });

    return NextResponse.json({ commissions, subIBs });
  } catch (error) {
    console.error("Fetch IB setup commission error:", error);
    return NextResponse.json({ error: "Failed to fetch commission setup" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { level, commissionType, value, groupName } = await request.json();

    if (level === undefined || !commissionType || value === undefined) {
      return NextResponse.json({ error: "level, commissionType, and value are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Upsert commission configuration
    const existing = await prisma.iBCommission.findFirst({
      where: { ibUserId: userId, level },
    });

    let commission;
    if (existing) {
      commission = await prisma.iBCommission.update({
        where: { id: existing.id },
        data: { commissionType, value, groupName: groupName || null },
      });
    } else {
      commission = await prisma.iBCommission.create({
        data: {
          ibUserId: userId,
          level,
          commissionType,
          value,
          groupName: groupName || null,
        },
      });
    }

    return NextResponse.json(commission, { status: 201 });
  } catch (error) {
    console.error("Create IB commission error:", error);
    return NextResponse.json({ error: "Failed to save commission configuration" }, { status: 500 });
  }
}
