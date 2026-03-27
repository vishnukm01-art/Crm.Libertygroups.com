import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetAccount } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, totalCommission: true, availableCommission: true, isIB: true, mt5Account: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch MT5 accounts with live balances
    const mt5Accounts = await prisma.mt5Account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    let totalBalance = 0;
    const enrichedAccounts = await Promise.all(
      mt5Accounts.map(async (acc) => {
        try {
          const result = await mt5GetAccount(acc.mt5Login);
          const balance = result.success && result.data ? result.data.balance : 0;
          totalBalance += balance;
          return {
            id: acc.id,
            mt5Login: acc.mt5Login,
            mt5Group: acc.mt5Group,
            leverage: acc.leverage,
            isDefault: acc.isDefault,
            balance,
          };
        } catch {
          return {
            id: acc.id,
            mt5Login: acc.mt5Login,
            mt5Group: acc.mt5Group,
            leverage: acc.leverage,
            isDefault: acc.isDefault,
            balance: 0,
          };
        }
      })
    );

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const where = { userId, ...(from || to ? { createdAt: dateFilter } : {}) };

    const deposits = await prisma.transaction.findMany({
      where: { ...where, type: "deposit", status: { in: ["approved", "completed"] } },
      select: { amount: true },
    });

    const withdrawals = await prisma.transaction.findMany({
      where: { ...where, type: "withdraw", status: { in: ["approved", "completed"] } },
      select: { amount: true },
    });

    const allTx = await prisma.transaction.findMany({
      where,
      select: { type: true, status: true },
    });

    const totalDeposits = deposits.reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((s, t) => s + t.amount, 0);
    const depositCount = deposits.length;
    const withdrawalCount = withdrawals.length;
    const pendingCount = allTx.filter((t) => t.status === "pending").length;

    return NextResponse.json({
      walletBalance: totalBalance,
      totalBalance,
      mt5Accounts: enrichedAccounts,
      totalDeposits,
      totalWithdrawals,
      netDeposit: totalDeposits - totalWithdrawals,
      depositCount,
      withdrawalCount,
      pendingCount,
      totalCommission: user.totalCommission,
      availableCommission: user.availableCommission,
      isIB: user.isIB,
      mt5Account: user.mt5Account,
    });
  } catch (error) {
    console.error("Fetch summary error:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
