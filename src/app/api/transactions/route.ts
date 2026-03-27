import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to + "T23:59:59");
      where.createdAt = dateFilter;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, mt5Account: true } },
        withdrawUser: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: t.user.name,
      userEmail: t.user.email,
      mt5Account: t.user.mt5Account,
      fromUser: t.user.name,
      fromEmail: t.user.email,
      toUser: t.withdrawUser?.name || "-",
      toEmail: t.withdrawUser?.email || "-",
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      paymentMethod: t.paymentMethod,
      reference: t.reference,
      notes: t.notes,
      createdAt: t.createdAt,
    })));
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
