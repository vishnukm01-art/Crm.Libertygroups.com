/**
 * Cleanup: remove stale old group records and ensure SmartPip ceiling exists.
 * Run with: npx tsx scripts/cleanup-old-groups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLD_NAMES = ["Smart", "Elite", "Prime", "Royal"];

async function main() {
  // Remove stale old group records that have been superseded by new names
  for (const name of OLD_NAMES) {
    const g = await prisma.group.findUnique({ where: { name } });
    if (g) {
      await prisma.group.delete({ where: { name } });
      console.log(`Deleted stale Group: "${name}"`);
    }
  }

  // Ensure SmartPip ceiling exists ($7/lot) - migration showed "Smart" wasn't found in ceilings
  const smartCeiling = await prisma.groupCommissionCeiling.findUnique({ where: { groupName: "SmartPip" } });
  if (!smartCeiling) {
    await prisma.groupCommissionCeiling.create({
      data: { groupName: "SmartPip", ceilingPerLot: 7 },
    });
    console.log("Created SmartPip ceiling: $7/lot");
  } else {
    console.log(`SmartPip ceiling already exists: $${smartCeiling.ceilingPerLot}/lot`);
  }

  // Print current state
  const groups = await prisma.group.findMany({ where: { source: "manual", isActive: true }, orderBy: { name: "asc" } });
  console.log("\nCurrent CRM-managed groups:", groups.map((g) => g.name));

  const ceilings = await prisma.groupCommissionCeiling.findMany({ orderBy: { ceilingPerLot: "asc" } });
  console.log("Current ceilings:", ceilings.map((c) => `${c.groupName}=$${c.ceilingPerLot}`));
}

main()
  .catch((e) => { console.error("Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
