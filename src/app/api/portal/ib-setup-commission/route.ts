import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true, ibParentId: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Get group ceilings
    const ceilings = await prisma.groupCommissionCeiling.findMany({
      where: { isActive: true },
      orderBy: { ceilingPerLot: "asc" },
    });

    // Get this IB's own allocation (what their parent assigned to them)
    const myAllocations = user.ibParentId
      ? await prisma.iBCommissionAssignment.findMany({
          where: { parentIBId: user.ibParentId, childIBId: userId },
        })
      : [];

    // Get this IB's own commissions from the old IBCommission table
    const myCommissions = await prisma.iBCommission.findMany({
      where: { ibUserId: userId },
      orderBy: { level: "asc" },
    });

    // Get direct children who are IBs (sub-IBs)
    const subIBs = await prisma.user.findMany({
      where: { ibParentId: userId },
      select: { id: true, name: true, email: true, isIB: true },
    });

    // Get existing assignments to children
    const childAssignments = await prisma.iBCommissionAssignment.findMany({
      where: { parentIBId: userId },
    });

    return NextResponse.json({
      ceilings,
      myAllocations,
      myCommissions,
      subIBs,
      childAssignments,
    });
  } catch (error) {
    console.error("Fetch IB setup commission error:", error);
    return NextResponse.json({ error: "Failed to fetch commission setup" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { childIBId, groupName, valuePerLot } = await request.json();

    if (!childIBId || !groupName || valuePerLot === undefined) {
      return NextResponse.json(
        { error: "childIBId, groupName, and valuePerLot are required" },
        { status: 400 }
      );
    }

    const value = parseFloat(valuePerLot);
    if (value < 0) {
      return NextResponse.json({ error: "Value must be non-negative" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true, ibParentId: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Validate child is under this IB
    const child = await prisma.user.findUnique({
      where: { id: childIBId },
      select: { ibParentId: true },
    });
    if (!child || child.ibParentId !== userId) {
      return NextResponse.json({ error: "User is not your direct sub-IB" }, { status: 400 });
    }

    // Validate against group ceiling
    const ceiling = await prisma.groupCommissionCeiling.findUnique({
      where: { groupName },
    });
    if (ceiling && value > ceiling.ceilingPerLot) {
      return NextResponse.json(
        { error: `Value $${value} exceeds group ceiling of $${ceiling.ceilingPerLot} for ${groupName}` },
        { status: 400 }
      );
    }

    // Validate against this IB's own allocation from parent
    if (user.ibParentId) {
      const myAllocation = await prisma.iBCommissionAssignment.findUnique({
        where: {
          parentIBId_childIBId_groupName: {
            parentIBId: user.ibParentId,
            childIBId: userId,
            groupName,
          },
        },
      });
      if (myAllocation && value > myAllocation.valuePerLot) {
        return NextResponse.json(
          { error: `Value $${value} exceeds your own allocation of $${myAllocation.valuePerLot} for ${groupName}` },
          { status: 400 }
        );
      }
    }

    // Also check the old IBCommission table for backwards compat
    const myCommission = await prisma.iBCommission.findFirst({
      where: { ibUserId: userId, groupName },
    });
    if (myCommission && value > myCommission.value) {
      return NextResponse.json(
        { error: `Value $${value} exceeds your commission of $${myCommission.value} for ${groupName}` },
        { status: 400 }
      );
    }

    // Upsert the assignment
    const assignment = await prisma.iBCommissionAssignment.upsert({
      where: {
        parentIBId_childIBId_groupName: { parentIBId: userId, childIBId, groupName },
      },
      update: { valuePerLot: value },
      create: { parentIBId: userId, childIBId, groupName, valuePerLot: value },
    });

    await prisma.auditLog.create({
      data: {
        adminId: userId,
        action: "IB_SUB_COMMISSION_SET",
        entity: "IBCommissionAssignment",
        entityId: assignment.id,
        details: `Set $${value}/lot for ${groupName} to sub-IB ${childIBId}`,
      },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error("Create IB commission error:", error);
    return NextResponse.json({ error: "Failed to save commission" }, { status: 500 });
  }
}
