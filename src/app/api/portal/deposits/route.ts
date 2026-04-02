import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetTrades } from "@/lib/mt5";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");

    const deposits = await prisma.transaction.findMany({
      where: { userId, type: "deposit", ...(from || to ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        reference: true,
        notes: true,
        proofFilePath: true,
        adminComment: true,
        createdAt: true,
      },
    });

    // Fetch MT5 balance operations (deposits made via MT5 Admin)
    const mt5Accounts = await prisma.mt5Account.findMany({
      where: { userId },
      select: { mt5Login: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mt5Account: true },
    });
    const allLogins = mt5Accounts.map((a) => a.mt5Login);
    if (user?.mt5Account && !allLogins.includes(user.mt5Account)) {
      allLogins.push(user.mt5Account);
    }

    let mt5Deposits: typeof deposits = [];
    try {
      const loginSet = new Set(allLogins);
      const allDeals = await Promise.all(
        allLogins.map(async (login) => {
          const result = await mt5GetTrades(login, from || undefined, to || undefined);
          return result.data || [];
        })
      );
      for (const deal of allDeals.flat()) {
        // Only include deals that belong to this user's MT5 accounts
        if (deal.login && !loginSet.has(deal.login)) continue;
        const action = (deal.action || "").toLowerCase();
        if ((action === "balance" || action === "2") && (deal.profit || 0) > 0) {
          mt5Deposits.push({
            id: `mt5-${deal.order || Date.now()}`,
            amount: deal.profit || 0,
            currency: "USD",
            status: "completed",
            paymentMethod: "MT5 Admin",
            reference: `MT5-${deal.order || ""}`,
            notes: null,
            proofFilePath: null,
            adminComment: "Direct MT5 balance operation",
            createdAt: deal.openTime || new Date().toISOString(),
          });
        }
      }
    } catch {
      // MT5 unavailable, just show CRM deposits
    }

    // Merge CRM deposits + MT5 deposits, sorted by date descending
    const allDeposits = [...deposits, ...mt5Deposits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(allDeposits);
  } catch (error) {
    console.error("Fetch deposits error:", error);
    return NextResponse.json({ error: "Failed to fetch deposits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("proof") as File | null;
    const mt5AccountId = formData.get("mt5AccountId") as string | null;

    if (!amount || !paymentMethod) {
      return NextResponse.json(
        { error: "amount and paymentMethod are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate MT5 account belongs to user if provided
    if (mt5AccountId) {
      const mt5Acc = await prisma.mt5Account.findFirst({ where: { id: mt5AccountId, userId } });
      if (!mt5Acc) return NextResponse.json({ error: "Invalid MT5 account" }, { status: 400 });
    }

    let proofFilePath: string | null = null;

    // Handle file upload — store as base64 data URL for serverless compatibility
    if (file && file.size > 0) {
      const maxSize = 5 * 1024 * 1024; // 5MB for base64 storage
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
      }

      const allowedTypes = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "File type not allowed. Use JPG, PNG, GIF, WebP, or PDF" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      proofFilePath = `data:${file.type};base64,${base64}`;
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        mt5AccountId: mt5AccountId || undefined,
        type: "deposit",
        amount,
        currency: "USD",
        status: "pending",
        paymentMethod,
        notes: notes || null,
        proofFilePath,
        reference: `DEP-${Date.now().toString(36).toUpperCase()}`,
      },
    });

    // Fire webhook event
    dispatchWebhookEvent("deposit.created", {
      transactionId: transaction.id,
      userId,
      amount,
      currency: "USD",
      paymentMethod,
      reference: transaction.reference,
    }).catch(() => {});

    return NextResponse.json(
      {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference,
        message: "Deposit request submitted successfully. Pending admin approval.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create deposit error:", error);
    return NextResponse.json({ error: "Failed to create deposit request" }, { status: 500 });
  }
}
