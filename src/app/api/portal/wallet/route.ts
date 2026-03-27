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
      select: { walletBalance: true, name: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch MT5 accounts with live balances
    const mt5Accounts = await prisma.mt5Account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const enrichedAccounts = await Promise.all(
      mt5Accounts.map(async (acc) => {
        try {
          const result = await mt5GetAccount(acc.mt5Login);
          return {
            id: acc.id,
            mt5Login: acc.mt5Login,
            mt5Group: acc.mt5Group,
            leverage: acc.leverage,
            isDefault: acc.isDefault,
            balance: result.success && result.data ? result.data.balance : 0,
            equity: result.success && result.data ? result.data.equity : 0,
          };
        } catch {
          return {
            id: acc.id,
            mt5Login: acc.mt5Login,
            mt5Group: acc.mt5Group,
            leverage: acc.leverage,
            isDefault: acc.isDefault,
            balance: 0,
            equity: 0,
          };
        }
      })
    );

    const totalBalance = enrichedAccounts.reduce((s, a) => s + a.balance, 0);

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        reference: true,
        createdAt: true,
        mt5AccountRef: { select: { mt5Login: true } },
      },
    });

    // Calculate summary
    const approved = transactions.filter((t) => t.status === "approved" || t.status === "completed");
    const totalIn = approved.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
    const totalOut = approved.filter((t) => t.type !== "deposit").reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      walletBalance: totalBalance,
      totalBalance,
      mt5Accounts: enrichedAccounts,
      totalIn,
      totalOut,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        paymentMethod: t.paymentMethod,
        reference: t.reference,
        createdAt: t.createdAt,
        mt5Login: t.mt5AccountRef?.mt5Login || null,
      })),
    });
  } catch (error) {
    console.error("Fetch wallet error:", error);
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 });
  }
}
