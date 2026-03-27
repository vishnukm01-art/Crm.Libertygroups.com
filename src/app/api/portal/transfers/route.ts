import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: Record<string, unknown> = { userId, type: "transfer" };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z");
    }

    const transfers = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        reference: true,
        notes: true,
        adminComment: true,
        createdAt: true,
        mt5AccountRef: { select: { mt5Login: true } },
        toMt5AccountRef: { select: { mt5Login: true } },
      },
    });

    return NextResponse.json(
      transfers.map((t) => ({
        id: t.id,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        paymentMethod: t.paymentMethod,
        reference: t.reference,
        notes: t.notes,
        adminComment: t.adminComment,
        createdAt: t.createdAt,
        fromMt5Login: t.mt5AccountRef?.mt5Login || null,
        toMt5Login: t.toMt5AccountRef?.mt5Login || null,
      }))
    );
  } catch (error) {
    console.error("Fetch transfers error:", error);
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}
