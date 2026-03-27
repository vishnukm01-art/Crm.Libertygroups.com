import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bonuses = await prisma.bonus.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, mt5Account: true } } },
    });
    return NextResponse.json(bonuses.map((b) => ({
      id: b.id,
      userName: b.user.name,
      userEmail: b.user.email,
      mt5Account: b.user.mt5Account,
      type: b.type,
      amount: b.amount,
      reason: b.reason,
      status: b.status,
      createdAt: b.createdAt,
    })));
  } catch (error) {
    console.error("Bonus history error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
