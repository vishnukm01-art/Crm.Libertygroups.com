import { prisma } from "@/lib/prisma";

/**
 * Retained Difference Commission Model
 * 
 * Example: Group ceiling Smart = $7/lot
 * Master IB allocation: $5/lot
 * Sub IB allocation: $3/lot
 * 
 * When user under Sub IB trades 1 lot:
 * - Sub IB earns: $3 (their allocation)
 * - Master IB retains: $5 - $3 = $2 (difference between their alloc and child's)
 * - Admin/System retains: $7 - $5 = $2 (difference between ceiling and master's alloc)
 * 
 * Rules:
 * - child allocation <= parent allocation
 * - parent allocation <= group ceiling
 * - no negative values
 * - no overflow beyond ceiling
 */

interface CommissionResult {
  ibUserId: string;
  ibName: string;
  level: number;
  commissionRate: number;
  totalCommission: number;
  type: "earned" | "retained";
}

/**
 * Walk up the IB chain from the trading user's direct parent
 * and calculate retained-difference commissions for each level.
 */
export async function calculateRetainedDifference(
  tradingUserId: string,
  groupName: string,
  lotsTraded: number
): Promise<CommissionResult[]> {
  const results: CommissionResult[] = [];

  // Get the trading user's direct IB parent
  const tradingUser = await prisma.user.findUnique({
    where: { id: tradingUserId },
    select: { ibParentId: true },
  });

  if (!tradingUser?.ibParentId) return results;

  // Get the group ceiling
  const ceiling = await prisma.groupCommissionCeiling.findUnique({
    where: { groupName },
  });

  // Walk up the IB chain
  let currentIBId: string | null = tradingUser.ibParentId;
  let previousAllocation = 0; // What the level below had allocated
  let level = 1;

  while (currentIBId) {
    const ib = await prisma.user.findUnique({
      where: { id: currentIBId },
      select: { id: true, name: true, ibParentId: true, isIB: true },
    });

    if (!ib || !ib.isIB) break;

    // Find what this IB was allocated by their parent
    let thisAllocation = 0;

    if (ib.ibParentId) {
      // Look up the assignment from parent to this IB
      const assignment = await prisma.iBCommissionAssignment.findUnique({
        where: {
          parentIBId_childIBId_groupName: {
            parentIBId: ib.ibParentId,
            childIBId: ib.id,
            groupName,
          },
        },
      });
      thisAllocation = assignment?.valuePerLot || 0;

      // Also check legacy IBCommission table
      if (thisAllocation === 0) {
        const legacyComm = await prisma.iBCommission.findFirst({
          where: { ibUserId: ib.id, groupName },
        });
        thisAllocation = legacyComm?.value || 0;
      }
    } else {
      // This is a Master IB (no parent), use their IBCommission or ceiling
      const masterComm = await prisma.iBCommission.findFirst({
        where: { ibUserId: ib.id, groupName },
      });
      thisAllocation = masterComm?.value || ceiling?.ceilingPerLot || 0;
    }

    // Retained difference = this IB's allocation - what they allocated to child
    const retainedRate = Math.max(0, thisAllocation - previousAllocation);
    const totalCommission = retainedRate * lotsTraded;

    if (retainedRate > 0) {
      results.push({
        ibUserId: ib.id,
        ibName: ib.name,
        level,
        commissionRate: retainedRate,
        totalCommission,
        type: level === 1 && previousAllocation === 0 ? "earned" : "retained",
      });
    }

    previousAllocation = thisAllocation;
    currentIBId = ib.ibParentId;
    level++;

    // Safety: max 10 levels
    if (level > 10) break;
  }

  return results;
}

/**
 * Process a trade and distribute commissions using retained-difference model.
 * Creates CommissionLedger entries and updates IB balances.
 */
export async function processTradeCommission(
  tradeId: string,
  mt5Login: string,
  tradingUserId: string,
  groupName: string,
  lotsTraded: number
): Promise<CommissionResult[]> {
  // Check for idempotency - skip if already processed
  const existing = await prisma.commissionLedger.findFirst({
    where: { tradeId },
  });
  if (existing) return [];

  const results = await calculateRetainedDifference(
    tradingUserId,
    groupName,
    lotsTraded
  );

  // Create ledger entries and update balances in a transaction
  if (results.length > 0) {
    await prisma.$transaction([
      // Create ledger entries
      ...results.map((r) =>
        prisma.commissionLedger.create({
          data: {
            ibUserId: r.ibUserId,
            tradeId,
            mt5Login,
            groupName,
            lotsTraded,
            commissionRate: r.commissionRate,
            totalCommission: r.totalCommission,
            level: r.level,
            type: r.type,
            sourceUserId: tradingUserId,
          },
        })
      ),
      // Update IB balances
      ...results.map((r) =>
        prisma.user.update({
          where: { id: r.ibUserId },
          data: {
            totalCommission: { increment: r.totalCommission },
            availableCommission: { increment: r.totalCommission },
          },
        })
      ),
      // Create audit log
      prisma.auditLog.create({
        data: {
          adminId: "system",
          action: "COMMISSION_DISTRIBUTED",
          entity: "CommissionLedger",
          entityId: tradeId,
          details: `Distributed commission for trade ${tradeId}: ${results.map((r) => `${r.ibName}=$${r.totalCommission.toFixed(2)}`).join(", ")}`,
        },
      }),
    ]);
  }

  return results;
}
