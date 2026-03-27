import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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

    return NextResponse.json(deposits);
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

    // Handle file upload
    if (file && file.size > 0) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
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

      const uploadDir = path.join(process.cwd(), "public", "uploads", "deposits", userId);
      await mkdir(uploadDir, { recursive: true });

      const ext = path.extname(file.name) || ".png";
      const safeFileName = `${Date.now()}-deposit${ext}`;
      const filePath = path.join(uploadDir, safeFileName);

      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      proofFilePath = `/uploads/deposits/${userId}/${safeFileName}`;
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
