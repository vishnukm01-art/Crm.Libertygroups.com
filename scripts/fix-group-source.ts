/**
 * Set the 4 MT5 Manager 7777 groups as CRM-managed (source: "manual")
 * so they appear in managedOnly=true queries.
 * Run with: npx tsx scripts/fix-group-source.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MT5_GROUPS = ["SmartPip", "ElitePip", "PrimePips", "RoyalPips"];

async function main() {
  for (const name of MT5_GROUPS) {
    const g = await prisma.group.findUnique({ where: { name } });
    if (g) {
      if (g.source !== "manual") {
        await prisma.group.update({ where: { name }, data: { source: "manual", isActive: true } });
        console.log(`Updated "${name}": source "${g.source}" -> "manual"`);
      } else {
        console.log(`"${name}" already source=manual`);
      }
    } else {
      // Create it as CRM-managed
      await prisma.group.create({ data: { name, isActive: true, source: "manual" } });
      console.log(`Created "${name}" as CRM-managed group`);
    }
  }

  // Print final state
  const groups = await prisma.group.findMany({ where: { source: "manual", isActive: true }, orderBy: { name: "asc" } });
  console.log("\nCRM-managed groups:", groups.map((g) => g.name));
}

main()
  .catch((e) => { console.error("Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
