import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueMt5Operation } from "@/lib/jobs";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const type = request.nextUrl.searchParams.get("type") || "withdraw";

    const where: Record<string, unknown> = { type };
    if (status && status !== "all") where.status = status;

    const withdrawals = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, mt5Account: true } },
        mt5AccountRef: { select: { id: true, mt5Login: true, mt5Group: true } },
      },
    });

    return NextResponse.json(
      withdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        userName: w.user.name,
        userEmail: w.user.email,
        userPhone: w.user.phone,
        mt5Account: w.mt5AccountRef?.mt5Login || w.user.mt5Account,
        mt5AccountId: w.mt5AccountId,
        mt5Group: w.mt5AccountRef?.mt5Group || null,
        amount: w.amount,
        currency: w.currency,
        status: w.status,
        paymentMethod: w.paymentMethod,
        reference: w.reference,
        notes: w.notes,
        adminComment: w.adminComment,
        createdAt: w.createdAt,
      }))
    );
  } catch (error) {
    console.error("Withdrawals fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, action, comment } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: "ID and action required" }, { status: 400 });
    }

    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: true,
        mt5AccountRef: true,
      },
    });

    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 400 });
    if (tx.status !== "pending") {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    if (action === "approve") {
      // Resolve MT5 login from the transaction's linked Mt5Account
      const mt5Login = tx.mt5AccountRef?.mt5Login || tx.user.mt5Account;

      await prisma.$transaction(async (p) => {
        await p.transaction.update({
          where: { id },
          data: { status: "approved", adminComment: comment || "Approved" },
        });
        await p.auditLog.create({
          data: {
            adminId: "admin",
            action: "ADMIN_WITHDRAWAL_APPROVED",
            entity: "transaction",
            entityId: id,
            details: `Withdrawal of $${tx.amount} approved (MT5: ${mt5Login || "N/A"}). ${comment || ""}`,
          },
        });
      });

      // Enqueue MT5 withdrawal as background job
      if (mt5Login && tx.type === "withdraw") {
        enqueueMt5Operation({
          type: "withdraw",
          mt5Login,
          amount: tx.amount,
          comment: `Withdrawal #${tx.id}`,
          transactionId: tx.id,
        }).catch((err) => console.error("Failed to enqueue MT5 withdrawal:", err));
      }

      // Fire webhook event
      dispatchWebhookEvent("withdrawal.approved", {
        transactionId: tx.id,
        userId: tx.userId,
        amount: tx.amount,
        currency: tx.currency,
        mt5Login: mt5Login || null,
      }).catch(() => {});
    } else if (action === "reject") {
      await prisma.$transaction(async (p) => {
        await p.transaction.update({
          where: { id },
          data: { status: "rejected", adminComment: comment || "Rejected" },
        });
        await p.auditLog.create({
          data: {
            adminId: "admin",
            action: "ADMIN_WITHDRAWAL_REJECTED",
            entity: "transaction",
            entityId: id,
            details: `Withdrawal of $${tx.amount} rejected. Reason: ${comment || "No reason"}`,
          },
        });
      });

      // Fire webhook event
      dispatchWebhookEvent("withdrawal.rejected", {
        transactionId: tx.id,
        userId: tx.userId,
        amount: tx.amount,
        reason: comment || "No reason provided",
      }).catch(() => {});
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Withdrawal action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
