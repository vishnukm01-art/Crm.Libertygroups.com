/**
 * One-time migration script to rename MT5 groups to match Manager 7777's actual group names.
 * Smart -> SmartPip, Elite -> ElitePip, Prime -> PrimePips, Royal -> RoyalPips
 *
 * Run with: npx tsx scripts/rename-groups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENAMES: Record<string, string> = {
  Smart: "SmartPip",
  Elite: "ElitePip",
  Prime: "PrimePips",
  Royal: "RoyalPips",
};

async function main() {
  console.log("Starting group rename migration...\n");

  for (const [oldName, newName] of Object.entries(RENAMES)) {
    console.log(`--- Renaming "${oldName}" -> "${newName}" ---`);

    // 1. Group table (unique on name)
    const existingGroup = await prisma.group.findUnique({ where: { name: oldName } });
    if (existingGroup) {
      // Check if newName already exists to avoid conflict
      const conflict = await prisma.group.findUnique({ where: { name: newName } });
      if (conflict) {
        console.log(`  Group: "${newName}" already exists, skipping (old "${oldName}" may be stale)`);
      } else {
        await prisma.group.update({ where: { name: oldName }, data: { name: newName } });
        console.log(`  Group: renamed`);
      }
    } else {
      console.log(`  Group: "${oldName}" not found, skipping`);
    }

    // 2. GroupCommissionCeiling table (unique on groupName)
    const existingCeiling = await prisma.groupCommissionCeiling.findUnique({ where: { groupName: oldName } });
    if (existingCeiling) {
      const conflict = await prisma.groupCommissionCeiling.findUnique({ where: { groupName: newName } });
      if (conflict) {
        console.log(`  GroupCommissionCeiling: "${newName}" already exists, skipping`);
      } else {
        await prisma.groupCommissionCeiling.update({ where: { groupName: oldName }, data: { groupName: newName } });
        console.log(`  GroupCommissionCeiling: renamed`);
      }
    } else {
      console.log(`  GroupCommissionCeiling: "${oldName}" not found, skipping`);
    }

    // 3. IBCommission table (groupName is optional, not unique)
    const ibCommResult = await prisma.iBCommission.updateMany({
      where: { groupName: oldName },
      data: { groupName: newName },
    });
    console.log(`  IBCommission: ${ibCommResult.count} records updated`);

    // 4. IBCommissionAssignment table (groupName in composite unique)
    // Need to handle carefully due to unique constraint
    const assignments = await prisma.iBCommissionAssignment.findMany({
      where: { groupName: oldName },
    });
    for (const a of assignments) {
      try {
        await prisma.iBCommissionAssignment.update({
          where: { id: a.id },
          data: { groupName: newName },
        });
      } catch (e) {
        console.log(`  IBCommissionAssignment: conflict updating ${a.id}, skipping`);
      }
    }
    console.log(`  IBCommissionAssignment: ${assignments.length} records processed`);

    // 5. CommissionLedger (groupName is optional)
    const ledgerResult = await prisma.commissionLedger.updateMany({
      where: { groupName: oldName },
      data: { groupName: newName },
    });
    console.log(`  CommissionLedger: ${ledgerResult.count} records updated`);

    // 6. MT5Account table (mt5Group field)
    const mt5Result = await prisma.mt5Account.updateMany({
      where: { mt5Group: oldName },
      data: { mt5Group: newName },
    });
    console.log(`  MT5Account: ${mt5Result.count} records updated`);

    // 7. User table (mt5Group field, legacy)
    const userResult = await prisma.user.updateMany({
      where: { mt5Group: oldName },
      data: { mt5Group: newName },
    });
    console.log(`  User: ${userResult.count} records updated`);

    console.log("");
  }

  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
