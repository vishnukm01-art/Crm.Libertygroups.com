import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true, availableCommission: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const withdrawals = await prisma.transaction.findMany({
      where: {
        userId,
        type: "ib_withdraw",
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        notes: true,
        adminComment: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      availableCommission: user.availableCommission,
      withdrawals,
    });
  } catch (error) {
    console.error("Fetch IB withdrawals error:", error);
    return NextResponse.json({ error: "Failed to fetch IB withdrawals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, bankDetailId, notes } = await request.json();

    if (!amount) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    if (user.availableCommission < amount) {
      return NextResponse.json({ error: "Insufficient available commission" }, { status: 400 });
    }

    if (bankDetailId) {
      const bank = await prisma.bankDetail.findFirst({
        where: { id: bankDetailId, userId, status: "approved" },
      });
      if (!bank) {
        return NextResponse.json({ error: "Invalid or unapproved bank account" }, { status: 400 });
      }
    }

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          type: "ib_withdraw",
          amount,
          currency: "USD",
          status: "pending",
          paymentMethod: "Bank Transfer",
          notes: notes || null,
          reference: `IBW-${Date.now().toString(36).toUpperCase()}`,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { availableCommission: { decrement: amount } },
      }),
    ]);

    return NextResponse.json(
      {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference,
        message: "IB withdrawal request submitted. Pending admin approval.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create IB withdrawal error:", error);
    return NextResponse.json({ error: "Failed to create IB withdrawal" }, { status: 500 });
  }
}
