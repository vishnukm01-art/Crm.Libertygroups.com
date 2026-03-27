import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: Record<string, unknown> = { type: "deposit" };
    if (status) where.status = status;

    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to + "T23:59:59");
      where.createdAt = dateFilter;
    }

    const deposits = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, mt5Account: true, phone: true },
        },
        mt5AccountRef: { select: { id: true, mt5Login: true, mt5Group: true } },
      },
    });

    return NextResponse.json(
      deposits.map((d) => ({
        id: d.id,
        userId: d.userId,
        userName: d.user.name,
        userEmail: d.user.email,
        userPhone: d.user.phone,
        mt5Account: d.mt5AccountRef?.mt5Login || d.user.mt5Account,
        mt5AccountId: d.mt5AccountId,
        mt5Group: d.mt5AccountRef?.mt5Group || null,
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        paymentMethod: d.paymentMethod,
        reference: d.reference,
        notes: d.notes,
        proofFilePath: d.proofFilePath,
        adminComment: d.adminComment,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
    );
  } catch (error) {
    console.error("Admin deposits fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
