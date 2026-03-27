import { prisma } from "@/lib/prisma";
import { mt5ChangeLeverage } from "@/lib/mt5";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, mt5AccountId, leverage } = await req.json();

    if (!userId || !leverage) {
      return NextResponse.json({ error: "userId and leverage are required" }, { status: 400 });
    }

    // Resolve MT5 login: prefer mt5AccountId, fall back to user.mt5Account
    let mt5Login: string | null = null;
    let mt5AccRecord: { id: string; mt5Login: string } | null = null;
    if (mt5AccountId) {
      mt5AccRecord = await prisma.mt5Account.findFirst({
        where: { id: mt5AccountId, userId },
      });
      if (!mt5AccRecord) {
        return NextResponse.json({ error: "MT5 account not found" }, { status: 404 });
      }
      mt5Login = mt5AccRecord.mt5Login;
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.mt5Account) {
        return NextResponse.json({ error: "User not found or has no MT5 account" }, { status: 404 });
      }
      mt5Login = user.mt5Account;
    }

    const result = await mt5ChangeLeverage(mt5Login, leverage);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Update Mt5Account record if we have one
    if (mt5AccRecord) {
      await prisma.mt5Account.update({
        where: { id: mt5AccRecord.id },
        data: { leverage },
      });
    }

    // Also update legacy User field if it matches
    await prisma.user.update({
      where: { id: userId },
      data: { leverage },
    });

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "CHANGE_MT5_LEVERAGE",
        entity: "user",
        entityId: userId,
        details: `MT5 leverage changed to ${leverage} for account ${mt5Login}`,
      },
    });

    return NextResponse.json({ success: true, mt5Login, leverage });
  } catch (error) {
    console.error("POST /api/mt5/change-leverage error:", error);
    return NextResponse.json({ error: "Failed to change leverage" }, { status: 500 });
  }
}
