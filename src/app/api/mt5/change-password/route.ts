import { prisma } from "@/lib/prisma";
import { mt5ChangePassword } from "@/lib/mt5";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, mt5AccountId, newPassword, type } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "userId and newPassword are required" }, { status: 400 });
    }

    // Resolve MT5 login: prefer mt5AccountId, fall back to user.mt5Account
    let mt5Login: string | null = null;
    if (mt5AccountId) {
      const mt5Acc = await prisma.mt5Account.findFirst({
        where: { id: mt5AccountId, userId },
      });
      if (!mt5Acc) {
        return NextResponse.json({ error: "MT5 account not found" }, { status: 404 });
      }
      mt5Login = mt5Acc.mt5Login;
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.mt5Account) {
        return NextResponse.json({ error: "User not found or has no MT5 account" }, { status: 404 });
      }
      mt5Login = user.mt5Account;
    }

    const result = await mt5ChangePassword(mt5Login, newPassword, type || "main");
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "CHANGE_MT5_PASSWORD",
        entity: "user",
        entityId: userId,
        details: `MT5 ${type || "main"} password changed for account ${mt5Login}`,
      },
    });

    return NextResponse.json({ success: true, mt5Login });
  } catch (error) {
    console.error("POST /api/mt5/change-password error:", error);
    return NextResponse.json({ error: "Failed to change MT5 password" }, { status: 500 });
  }
}
