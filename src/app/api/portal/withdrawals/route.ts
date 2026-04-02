import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetAccount, mt5GetOpenPositions, mt5GetTrades } from "@/lib/mt5";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: Record<string, unknown> = { userId, type: "withdraw" };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z");
    }

    const withdrawals = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, currency: true, status: true,
        paymentMethod: true, reference: true, notes: true,
        adminComment: true, createdAt: true,
        mt5AccountRef: { select: { mt5Login: true } },
      },
    });

    // Fetch MT5 balance operations (withdrawals = negative balance operations)
    const mt5Accounts = await prisma.mt5Account.findMany({
      where: { userId },
      select: { mt5Login: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mt5Account: true },
    });
    const allLogins = mt5Accounts.map((a) => a.mt5Login);
    if (user?.mt5Account && !allLogins.includes(user.mt5Account)) {
      allLogins.push(user.mt5Account);
    }

    type WithdrawalRow = (typeof withdrawals)[number];
    let mt5Withdrawals: WithdrawalRow[] = [];
    try {
      const allDeals = await Promise.all(
        allLogins.map(async (login) => {
          const result = await mt5GetTrades(login, from || undefined, to || undefined);
          return result.data || [];
        })
      );
      for (const deal of allDeals.flat()) {
        const action = (deal.action || "").toLowerCase();
        if ((action === "balance" || action === "2") && (deal.profit || 0) < 0) {
          mt5Withdrawals.push({
            id: `mt5-${deal.order || Date.now()}`,
            amount: Math.abs(deal.profit || 0),
            currency: "USD",
            status: "completed",
            paymentMethod: "MT5 Admin",
            reference: `MT5-${deal.order || ""}`,
            notes: null,
            adminComment: "Direct MT5 balance operation",
            createdAt: new Date(deal.openTime || Date.now()),
            mt5AccountRef: null,
          });
        }
      }
    } catch {
      // MT5 unavailable, just show CRM withdrawals
    }

    // Merge CRM + MT5 withdrawals, sorted by date descending
    const allWithdrawals = [...withdrawals, ...mt5Withdrawals].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(allWithdrawals);
  } catch (error) {
    console.error("Fetch withdrawals error:", error);
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, mt5AccountId, bankDetailId, paymentMethod, notes } = await request.json();

    if (!amount || !mt5AccountId) {
      return NextResponse.json({ error: "amount and mt5AccountId are required" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify MT5 account belongs to user
    const mt5Acc = await prisma.mt5Account.findFirst({ where: { id: mt5AccountId, userId } });
    if (!mt5Acc) return NextResponse.json({ error: "Invalid MT5 account" }, { status: 400 });

    // Check for open positions - withdrawal only allowed if all trades closed
    const positionsResult = await mt5GetOpenPositions(mt5Acc.mt5Login);
    if (positionsResult.success && positionsResult.data && positionsResult.data.length > 0) {
      return NextResponse.json({
        error: "Cannot withdraw: account has open positions. Close all trades first.",
      }, { status: 400 });
    }

    // Check live MT5 balance
    const balanceResult = await mt5GetAccount(mt5Acc.mt5Login);
    if (!balanceResult.success || !balanceResult.data) {
      return NextResponse.json({ error: "Unable to verify account balance. Try again later." }, { status: 503 });
    }
    if (balanceResult.data.balance < amount) {
      return NextResponse.json({ error: `Insufficient balance. Available: $${balanceResult.data.balance.toFixed(2)}` }, { status: 400 });
    }

    // Verify bank detail if provided
    if (bankDetailId) {
      const bank = await prisma.bankDetail.findFirst({
        where: { id: bankDetailId, userId, status: "approved" },
      });
      if (!bank) return NextResponse.json({ error: "Invalid or unapproved bank account" }, { status: 400 });
    }

    // Create withdrawal transaction (no wallet deduction - uses MT5 balance directly)
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        mt5AccountId,
        type: "withdraw",
        amount,
        currency: "USD",
        status: "pending",
        paymentMethod: paymentMethod || "Bank Transfer",
        notes: notes || null,
        reference: `WDR-${Date.now().toString(36).toUpperCase()}`,
      },
    });

    // Fire webhook event
    dispatchWebhookEvent("withdrawal.created", {
      transactionId: transaction.id,
      userId,
      amount,
      currency: "USD",
      mt5Login: mt5Acc.mt5Login,
      reference: transaction.reference,
    }).catch(() => {});

    return NextResponse.json(
      {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference,
        message: "Withdrawal request submitted successfully. Pending admin approval.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create withdrawal error:", error);
    return NextResponse.json({ error: "Failed to create withdrawal request" }, { status: 500 });
  }
}
