import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - List all group commission ceilings
export async function GET() {
  try {
    const ceilings = await prisma.groupCommissionCeiling.findMany({
      orderBy: { ceilingPerLot: "asc" },
    });
    return NextResponse.json(ceilings);
  } catch (error) {
    console.error("Group ceilings fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Create or update a group commission ceiling
export async function POST(req: NextRequest) {
  try {
    const { groupName, ceilingPerLot, description } = await req.json();

    if (!groupName || ceilingPerLot === undefined) {
      return NextResponse.json({ error: "groupName and ceilingPerLot are required" }, { status: 400 });
    }

    if (ceilingPerLot < 0) {
      return NextResponse.json({ error: "ceilingPerLot must be non-negative" }, { status: 400 });
    }

    const ceiling = await prisma.groupCommissionCeiling.upsert({
      where: { groupName },
      update: { ceilingPerLot: parseFloat(ceilingPerLot), description: description || null },
      create: { groupName, ceilingPerLot: parseFloat(ceilingPerLot), description: description || null },
    });

    await prisma.auditLog.create({
      data: {
        adminId: "admin",
        action: "GROUP_CEILING_SET",
        entity: "GroupCommissionCeiling",
        entityId: ceiling.id,
        details: `Set ${groupName} ceiling to $${ceilingPerLot}/lot`,
      },
    });

    return NextResponse.json(ceiling);
  } catch (error) {
    console.error("Group ceiling create error:", error);
    return NextResponse.json({ error: "Failed to set group ceiling" }, { status: 500 });
  }
}

// DELETE - Remove a group commission ceiling
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.groupCommissionCeiling.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Group ceiling delete error:", error);
    return NextResponse.json({ error: "Failed to delete ceiling" }, { status: 500 });
  }
}
