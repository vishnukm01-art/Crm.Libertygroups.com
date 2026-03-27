import { prisma } from "@/lib/prisma";
import { mt5CreateAccount } from "@/lib/mt5";
import { emailMT5AccountCreated } from "@/lib/email";
import { enqueueEmail } from "@/lib/jobs";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { NextRequest, NextResponse } from "next/server";

const MAX_MT5_ACCOUNTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { userId, group, leverage, password } = await req.json();

    if (!userId || !group || !leverage || !password) {
      return NextResponse.json({ error: "userId, group, leverage, and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { mt5Accounts: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check max accounts limit
    if (user.mt5Accounts.length >= MAX_MT5_ACCOUNTS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_MT5_ACCOUNTS} MT5 accounts allowed per user` },
        { status: 400 }
      );
    }

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
      const statusCode = result.errorCode === "IP_BLOCKED" ? 503 : 500;
      return NextResponse.json(
        {
          error: result.error || "Failed to create MT5 account",
          errorCode: result.errorCode,
        },
        { status: statusCode }
      );
    }

    const isFirstAccount = user.mt5Accounts.length === 0;

    // Create Mt5Account row
    const mt5Account = await prisma.mt5Account.create({
      data: {
        userId,
        mt5Login: result.data.login,
        mt5Group: group,
        leverage,
        isDefault: isFirstAccount,
      },
    });

    // Backward compatibility: update legacy User fields for first account
    if (isFirstAccount) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          mt5Account: result.data.login,
          mt5Group: group,
          leverage,
          status: user.status === "pending" ? "active" : user.status,
        },
      });
    } else if (user.status === "pending") {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "active" },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "CREATE_MT5_ACCOUNT",
        entity: "user",
        entityId: userId,
        details: `MT5 account ${result.data.login} created for ${user.name} (group: ${group}, leverage: ${leverage}, account #${user.mt5Accounts.length + 1})`,
      },
    });

    // Send email notification via background job
    const emailData = emailMT5AccountCreated(user.name, user.email, result.data.login, password, group, leverage);
    enqueueEmail(emailData).catch((err) => console.error("Failed to enqueue email:", err));

    // Fire webhook event
    dispatchWebhookEvent("mt5.account_created", {
      userId,
      mt5Login: result.data.login,
      group,
      leverage,
      accountNumber: user.mt5Accounts.length + 1,
    }).catch(() => {});

    return NextResponse.json({
      mt5Login: result.data.login,
      mt5AccountId: mt5Account.id,
      group,
      leverage,
      isDefault: isFirstAccount,
      accountNumber: user.mt5Accounts.length + 1,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/mt5/create-account error:", error);
    return NextResponse.json({ error: "Failed to create MT5 account" }, { status: 500 });
  }
}
