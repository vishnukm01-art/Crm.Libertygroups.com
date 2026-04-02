/**
 * Commission Cleanup Script v2
 * Deletes ALL CommissionLedger entries and resets ALL IB users'
 * totalCommission and availableCommission to 0.
 *
 * Run with: npx tsx scripts/cleanup-commissions-v2.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Commission Cleanup v2 ===\n");

  // 1. Count existing ledger entries
  const count = await prisma.commissionLedger.count();
  console.log(`Found ${count} CommissionLedger entries`);

  // 2. Show summary of what will be deleted
  if (count > 0) {
    const summary = await prisma.commissionLedger.groupBy({
      by: ["ibUserId"],
      _sum: { totalCommission: true, lotsTraded: true },
      _count: true,
    });
    console.log("\nEntries by IB:");
    for (const s of summary) {
      console.log(
        `  IB ${s.ibUserId}: ${s._count} entries, lots=${s._sum.lotsTraded?.toFixed(2)}, commission=$${s._sum.totalCommission?.toFixed(2)}`
      );
    }
  }

  // 3. Delete all CommissionLedger entries
  const deleted = await prisma.commissionLedger.deleteMany({});
  console.log(`\nDeleted ${deleted.count} CommissionLedger entries`);

  // 4. Reset ALL IB user balances to 0
  const resetResult = await prisma.user.updateMany({
    where: {
      isIB: true,
    },
    data: {
      totalCommission: 0,
      availableCommission: 0,
    },
  });
  console.log(`Reset commission balances for ${resetResult.count} IB users`);

  // 5. Verify
  const remaining = await prisma.commissionLedger.count();
  const ibsWithBalance = await prisma.user.count({
    where: {
      isIB: true,
      OR: [
        { totalCommission: { gt: 0 } },
        { availableCommission: { gt: 0 } },
      ],
    },
  });
  console.log(`\nVerification:`);
  console.log(`  Remaining ledger entries: ${remaining}`);
  console.log(`  IBs with non-zero balance: ${ibsWithBalance}`);
  console.log("\nDone!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
