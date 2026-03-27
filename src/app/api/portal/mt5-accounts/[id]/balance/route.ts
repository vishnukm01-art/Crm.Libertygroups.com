import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetAccount, mt5GetOpenPositions } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const account = await prisma.mt5Account.findFirst({
      where: { id: params.id, userId },
      select: { id: true, mt5Login: true, mt5Group: true, leverage: true },
    });

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Fetch live balance and open positions in parallel
    const [balanceResult, positionsResult] = await Promise.all([
      mt5GetAccount(account.mt5Login),
      mt5GetOpenPositions(account.mt5Login),
    ]);

    const balance = balanceResult.success && balanceResult.data ? balanceResult.data.balance : 0;
    const equity = balanceResult.success && balanceResult.data ? balanceResult.data.equity : 0;
    const credit = balanceResult.success && balanceResult.data ? ((balanceResult.data as unknown as Record<string, unknown>).credit as number || 0) : 0;
    const openPositions = positionsResult.success && positionsResult.data ? positionsResult.data : [];
    const hasOpenPositions = openPositions.length > 0;

    return NextResponse.json({
      id: account.id,
      mt5Login: account.mt5Login,
      mt5Group: account.mt5Group,
      leverage: account.leverage,
      balance,
      equity,
      credit,
      hasOpenPositions,
      openPositionCount: openPositions.length,
    });
  } catch (error) {
    console.error("Fetch MT5 account balance error:", error);
    return NextResponse.json({ error: "Failed to fetch account balance" }, { status: 500 });
  }
}
