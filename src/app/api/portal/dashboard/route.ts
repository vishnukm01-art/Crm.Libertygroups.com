import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetAccount } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, phone: true, country: true, status: true,
        kycStatus: true, walletBalance: true, mt5Account: true, isIB: true,
        totalCommission: true, availableCommission: true,
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch all MT5 accounts with live balances
    const mt5Accounts = await prisma.mt5Account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, mt5Login: true, mt5Group: true, leverage: true, isDefault: true, createdAt: true },
    });

    const enrichedAccounts = await Promise.all(
      mt5Accounts.map(async (acc) => {
        try {
          const result = await mt5GetAccount(acc.mt5Login);
          if (result.success && result.data) {
            return {
              ...acc,
              balance: result.data.balance,
              equity: result.data.equity,
              margin: result.data.margin,
              freeMargin: result.data.freeMargin,
              currency: result.data.currency,
            };
          }
        } catch { /* MT5 unavailable */ }
        return { ...acc, balance: 0, equity: 0, margin: 0, freeMargin: 0, currency: "USD" };
      })
    );

    const totalBalance = enrichedAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const recentTransactions = await prisma.transaction.findMany({
      where: { OR: [{ userId }, { withdrawUserId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, amount: true, status: true, createdAt: true },
    });

    const pendingDocuments = await prisma.document.count({ where: { userId, status: "pending" } });
    const pendingBankDetails = await prisma.bankDetail.count({ where: { userId, status: "pending" } });

    return NextResponse.json({
      user: { ...user, walletBalance: totalBalance },
      mt5Accounts: enrichedAccounts,
      totalBalance,
      recentTransactions,
      pendingDocuments,
      pendingBankDetails,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
