import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - List commission assignments for an IB
export async function GET(req: NextRequest) {
  try {
    const ibId = req.nextUrl.searchParams.get("ibId");
    const childId = req.nextUrl.searchParams.get("childId");

    const where: Record<string, string> = {};
    if (ibId) where.parentIBId = ibId;
    if (childId) where.childIBId = childId;

    const assignments = await prisma.iBCommissionAssignment.findMany({
      where,
      orderBy: { groupName: "asc" },
    });

    // Enrich with user names
    const parentIds = [...new Set(assignments.map((a) => a.parentIBId))];
    const childIds = [...new Set(assignments.map((a) => a.childIBId))];
    const allIds = [...new Set([...parentIds, ...childIds])];

    const users = await prisma.user.findMany({
      where: { id: { in: allIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = assignments.map((a) => ({
      ...a,
      parentName: userMap[a.parentIBId]?.name || "Unknown",
      parentEmail: userMap[a.parentIBId]?.email || "",
      childName: userMap[a.childIBId]?.name || "Unknown",
      childEmail: userMap[a.childIBId]?.email || "",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Commission assignments fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Create or update a commission assignment
export async function POST(req: NextRequest) {
  try {
    const { parentIBId, childIBId, groupName, valuePerLot } = await req.json();

    if (!parentIBId || !childIBId || !groupName || valuePerLot === undefined) {
      return NextResponse.json(
        { error: "parentIBId, childIBId, groupName, and valuePerLot are required" },
        { status: 400 }
      );
    }

    const value = parseFloat(valuePerLot);
    if (value < 0) {
      return NextResponse.json({ error: "valuePerLot must be non-negative" }, { status: 400 });
    }

    // Validate parent is actually an IB
    const parent = await prisma.user.findUnique({
      where: { id: parentIBId },
      select: { isIB: true, ibParentId: true },
    });
    if (!parent || !parent.isIB) {
      return NextResponse.json({ error: "Parent is not an IB" }, { status: 400 });
    }

    // Validate child is under parent
    const child = await prisma.user.findUnique({
      where: { id: childIBId },
      select: { ibParentId: true },
    });
    if (!child || child.ibParentId !== parentIBId) {
      return NextResponse.json({ error: "Child is not directly under this parent IB" }, { status: 400 });
    }

    // Validate against group ceiling
    const ceiling = await prisma.groupCommissionCeiling.findUnique({
      where: { groupName },
    });
    if (ceiling && value > ceiling.ceilingPerLot) {
      return NextResponse.json(
        { error: `Value ${value} exceeds group ceiling of ${ceiling.ceilingPerLot} for ${groupName}` },
        { status: 400 }
      );
    }

    // Validate child allocation doesn't exceed parent's allocation
    // Find parent's own allocation from their parent
    if (parent.ibParentId) {
      const parentAllocation = await prisma.iBCommissionAssignment.findUnique({
        where: {
          parentIBId_childIBId_groupName: {
            parentIBId: parent.ibParentId,
            childIBId: parentIBId,
            groupName,
          },
        },
      });
      if (parentAllocation && value > parentAllocation.valuePerLot) {
        return NextResponse.json(
          { error: `Value ${value} exceeds parent's allocation of ${parentAllocation.valuePerLot} for ${groupName}` },
          { status: 400 }
        );
      }
    }

    const assignment = await prisma.iBCommissionAssignment.upsert({
      where: {
        parentIBId_childIBId_groupName: { parentIBId, childIBId, groupName },
      },
      update: { valuePerLot: value },
      create: { parentIBId, childIBId, groupName, valuePerLot: value },
    });

    await prisma.auditLog.create({
      data: {
        adminId: parentIBId,
        action: "IB_COMMISSION_ASSIGNMENT",
        entity: "IBCommissionAssignment",
        entityId: assignment.id,
        details: `Assigned $${value}/lot for ${groupName} to child IB`,
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Commission assignment create error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
