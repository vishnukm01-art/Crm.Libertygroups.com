import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueMt5Operation, enqueueEmail } from "@/lib/jobs";
import { emailDepositConfirmation } from "@/lib/email";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, comment } = await request.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        mt5AccountRef: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.type !== "deposit") {
      return NextResponse.json({ error: "Transaction is not a deposit" }, { status: 400 });
    }

    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: `Transaction is already ${transaction.status}` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const mt5Login = transaction.mt5AccountRef?.mt5Login || transaction.user.mt5Account;

      // Update transaction status immediately
      await prisma.transaction.update({
        where: { id: params.id },
        data: {
          status: "approved",
          adminComment: comment || "Deposit approved",
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: "admin",
          action: "DEPOSIT_APPROVED",
          entity: "transaction",
          entityId: params.id,
          details: `Approved deposit of $${transaction.amount} for ${transaction.user.name} (MT5: ${mt5Login || "N/A"}). ${comment || ""}`,
        },
      });

      // Enqueue MT5 deposit as background job
      if (mt5Login) {
        enqueueMt5Operation({
          type: "deposit",
          mt5Login,
          amount: transaction.amount,
          comment: `Deposit #${transaction.id}`,
          transactionId: transaction.id,
        }).catch((err) => console.error("Failed to enqueue MT5 deposit:", err));
      }

      // Enqueue email as background job
      const emailData = emailDepositConfirmation(
        transaction.user.name,
        transaction.user.email,
        transaction.amount,
        transaction.currency || "USD"
      );
      enqueueEmail(emailData).catch((err) => console.error("Failed to enqueue email:", err));

      // Fire webhook event
      dispatchWebhookEvent("deposit.approved", {
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        mt5Login: mt5Login || null,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Deposit approved successfully",
        status: "approved",
      });
    } else {
      // Reject
      await prisma.transaction.update({
        where: { id: params.id },
        data: {
          status: "rejected",
          adminComment: comment || "Deposit rejected",
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: "admin",
          action: "DEPOSIT_REJECTED",
          entity: "transaction",
          entityId: params.id,
          details: `Rejected deposit of $${transaction.amount} for ${transaction.user.name}. Reason: ${comment || "No reason provided"}`,
        },
      });

      // Fire webhook event
      dispatchWebhookEvent("deposit.rejected", {
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        reason: comment || "No reason provided",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Deposit rejected",
        status: "rejected",
      });
    }
  } catch (error) {
    console.error("Admin deposit action error:", error);
    return NextResponse.json({ error: "Failed to process deposit action" }, { status: 500 });
  }
}
