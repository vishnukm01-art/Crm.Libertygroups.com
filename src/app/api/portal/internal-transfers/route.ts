import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetAccount } from "@/lib/mt5";
import { enqueueMt5Operation } from "@/lib/jobs/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const transfers = await prisma.transaction.findMany({
      where: {
        userId,
        type: "transfer",
        mt5AccountId: { not: null },
        toMt5AccountId: { not: null },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, currency: true, status: true, reference: true, notes: true, createdAt: true,
        mt5AccountRef: { select: { mt5Login: true } },
        toMt5AccountRef: { select: { mt5Login: true } },
      },
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Fetch internal transfers error:", error);
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fromAccountId, toAccountId, amount } = await request.json();
    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json({ error: "fromAccountId, toAccountId, and amount are required" }, { status: 400 });
    }
    if (amount <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    if (fromAccountId === toAccountId) return NextResponse.json({ error: "Source and destination must be different" }, { status: 400 });

    // Verify both accounts belong to user
    const [fromAcc, toAcc] = await Promise.all([
      prisma.mt5Account.findFirst({ where: { id: fromAccountId, userId } }),
      prisma.mt5Account.findFirst({ where: { id: toAccountId, userId } }),
    ]);
    if (!fromAcc) return NextResponse.json({ error: "Source account not found" }, { status: 404 });
    if (!toAcc) return NextResponse.json({ error: "Destination account not found" }, { status: 404 });

    // Check source balance
    const balanceResult = await mt5GetAccount(fromAcc.mt5Login);
    if (!balanceResult.success || !balanceResult.data) {
      return NextResponse.json({ error: "Unable to verify source account balance" }, { status: 503 });
    }
    if (balanceResult.data.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance in source account" }, { status: 400 });
    }

    // Create transaction record first
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        mt5AccountId: fromAcc.id,
        toMt5AccountId: toAcc.id,
        type: "transfer",
        amount,
        currency: "USD",
        status: "pending",
        paymentMethod: "internal_transfer",
        reference: `TRF-${Date.now().toString(36).toUpperCase()}`,
        notes: `Transfer from ${fromAcc.mt5Login} to ${toAcc.mt5Login}`,
      },
    });

    // Enqueue both MT5 operations as background jobs
    const withdrawJobId = await enqueueMt5Operation({
      type: "withdraw",
      mt5Login: fromAcc.mt5Login,
      amount,
      comment: `Transfer to ${toAcc.mt5Login}`,
      transactionId: transaction.id,
    });
    const depositJobId = await enqueueMt5Operation({
      type: "deposit",
      mt5Login: toAcc.mt5Login,
      amount,
      comment: `Transfer from ${fromAcc.mt5Login}`,
      transactionId: transaction.id,
    });

    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      withdrawJobId,
      depositJobId,
      message: "Transfer queued for processing",
    }, { status: 202 });
  } catch (error) {
    console.error("Internal transfer error:", error);
    return NextResponse.json({ error: "Failed to process transfer" }, { status: 500 });
  }
}
