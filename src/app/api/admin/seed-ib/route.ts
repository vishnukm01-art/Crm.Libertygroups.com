import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seed-ib
 * Seeds default group commission ceilings if they don't exist.
 * Smart=7, Elite=14, Prime=21, Royal=30
 */
export async function POST() {
  try {
    const defaults = [
      { groupName: "Smart", ceilingPerLot: 7, description: "Smart tier - entry level" },
      { groupName: "Elite", ceilingPerLot: 14, description: "Elite tier - mid level" },
      { groupName: "Prime", ceilingPerLot: 21, description: "Prime tier - advanced" },
      { groupName: "Royal", ceilingPerLot: 30, description: "Royal tier - premium" },
    ];

    const results = [];
    for (const d of defaults) {
      const existing = await prisma.groupCommissionCeiling.findUnique({
        where: { groupName: d.groupName },
      });
      if (!existing) {
        const created = await prisma.groupCommissionCeiling.create({ data: d });
        results.push({ ...created, action: "created" });
      } else {
        results.push({ ...existing, action: "already_exists" });
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: "admin",
        action: "IB_SEED_CEILINGS",
        entity: "GroupCommissionCeiling",
        entityId: "seed",
        details: `Seeded ${results.filter((r) => r.action === "created").length} group ceilings`,
      },
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
