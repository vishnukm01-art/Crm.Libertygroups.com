import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function GET() {
  try {
    const commissions = await prisma.iBCommission.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userIds = Array.from(new Set(commissions.map((c) => c.ibUserId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = commissions.map((c) => ({
      id: c.id,
      ibUserId: c.ibUserId,
      name: userMap[c.ibUserId]?.name || "Unknown",
      email: userMap[c.ibUserId]?.email || "",
      groupName: c.groupName || "Default",
      commissionType: c.commissionType,
      value: c.value,
      level: c.level,
      createdAt: c.createdAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("IB commission list error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ibUserId, groupName, commissionType, value, level } = body;

    if (!ibUserId || value === undefined) {
      return NextResponse.json({ error: "ibUserId and value are required" }, { status: 400 });
    }

    const commission = await prisma.iBCommission.create({
      data: {
        ibUserId,
        groupName: groupName || null,
        commissionType: commissionType || "per_lot",
        value: parseFloat(value),
        level: level || 1,
      },
    });

    dispatchWebhookEvent("ib.commission_calculated", {
      commissionId: commission.id,
      ibUserId,
      groupName: groupName || "Default",
      commissionType: commissionType || "per_lot",
      value: parseFloat(value),
      level: level || 1,
    }).catch(() => {});

    return NextResponse.json(commission);
  } catch (error) {
    console.error("IB commission create error:", error);
    return NextResponse.json({ error: "Failed to create commission" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, groupName, value, commissionType } = body;

    if (!id) return NextResponse.json({ error: "Commission ID is required" }, { status: 400 });

    const updated = await prisma.iBCommission.update({
      where: { id },
      data: {
        ...(groupName !== undefined && { groupName }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(commissionType && { commissionType }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("IB commission update error:", error);
    return NextResponse.json({ error: "Failed to update commission" }, { status: 500 });
  }
}
