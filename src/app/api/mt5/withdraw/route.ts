import { prisma } from "@/lib/prisma";
import { emailWithdrawalProcessed } from "@/lib/email";
import { enqueueMt5Operation, enqueueEmail } from "@/lib/jobs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.type !== "withdraw" && transaction.type !== "ib_withdraw") {
      return NextResponse.json({ error: "Transaction is not a withdrawal" }, { status: 400 });
    }

    if (transaction.status === "completed") {
      return NextResponse.json({ error: "Transaction already completed" }, { status: 400 });
    }

    if (!transaction.user.mt5Account) {
      return NextResponse.json({ error: "User has no MT5 account" }, { status: 400 });
    }

    // Update status to processing
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "approved" },
    });

    // Enqueue MT5 withdrawal as background job
    const jobId = await enqueueMt5Operation({
      type: "withdraw",
      mt5Login: transaction.user.mt5Account,
      amount: transaction.amount,
      comment: `Withdrawal #${transaction.id}`,
      transactionId: transaction.id,
    });

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "MT5_WITHDRAW",
        entity: "transaction",
        entityId: transactionId,
        details: `$${transaction.amount} withdrawal enqueued for MT5 account ${transaction.user.mt5Account} (job: ${jobId})`,
      },
    });

    // Enqueue email as background job
    enqueueEmail(emailWithdrawalProcessed(
      transaction.user.name,
      transaction.user.email,
      transaction.amount,
      transaction.currency || "USD"
    )).catch((err) => console.error("Failed to enqueue email:", err));

    return NextResponse.json({ success: true, jobId, status: "queued" }, { status: 202 });
  } catch (error) {
    console.error("POST /api/mt5/withdraw error:", error);
    return NextResponse.json({ error: "Failed to process withdrawal" }, { status: 500 });
  }
}
