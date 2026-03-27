import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5CreateAccount, mt5GetAccount } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.mt5Account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, mt5Login: true, mt5Group: true, leverage: true, isDefault: true, createdAt: true },
    });

    // Fetch live balances from MT5 server in parallel
    const enriched = await Promise.all(
      accounts.map(async (acc) => {
        try {
          const result = await mt5GetAccount(acc.mt5Login);
          if (result.success && result.data) {
            return {
              ...acc,
              balance: result.data.balance,
              equity: result.data.equity,
              margin: result.data.margin,
              freeMargin: result.data.freeMargin,
              currency: result.data.currency,
            };
          }
        } catch { /* MT5 unavailable */ }
        return { ...acc, balance: 0, equity: 0, margin: 0, freeMargin: 0, currency: "USD" };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Fetch MT5 accounts error:", error);
    return NextResponse.json({ error: "Failed to fetch MT5 accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { group, leverage, password, investorPassword } = await request.json();
    if (!group || !leverage || !password) {
      return NextResponse.json({ error: "group, leverage, and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, country: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Enforce max 5 accounts
    const accountCount = await prisma.mt5Account.count({ where: { userId } });
    if (accountCount >= 5) {
      return NextResponse.json({ error: "Maximum 5 MT5 accounts allowed" }, { status: 400 });
    }

    // Create MT5 account on the server
    const result = await mt5CreateAccount({
      name: user.name,
      email: user.email,
      group,
      leverage,
      password,
      phone: user.phone || undefined,
      country: user.country || undefined,
    });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || "Failed to create MT5 account" }, { status: 500 });
    }

    const mt5Data = result.data;

    // Create Mt5Account record in DB
    const mt5Account = await prisma.mt5Account.create({
      data: {
        userId,
        mt5Login: mt5Data.login,
        mt5Group: mt5Data.group || group,
        leverage: mt5Data.leverage || leverage,
        isDefault: accountCount === 0,
      },
    });

    // Also set on User for backward compatibility (first account only)
    if (accountCount === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { mt5Account: mt5Data.login, mt5Group: mt5Data.group || group, leverage: mt5Data.leverage || leverage },
      });
    }

    return NextResponse.json({
      id: mt5Account.id,
      mt5Login: mt5Account.mt5Login,
      mt5Group: mt5Account.mt5Group,
      leverage: mt5Account.leverage,
      isDefault: mt5Account.isDefault,
      message: "MT5 account created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Create MT5 account error:", error);
    return NextResponse.json({ error: "Failed to create MT5 account" }, { status: 500 });
  }
}
