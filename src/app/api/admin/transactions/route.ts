import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueMt5Operation } from "@/lib/jobs/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, userId, mt5AccountId, amount, comment, withdrawTo, toAccountId } = body;

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ error: "Type and positive amount are required" }, { status: 400 });
    }

    switch (type) {
      case "client_deposit": {
        if (!userId) return NextResponse.json({ error: "Client is required" }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "Client not found" }, { status: 400 });

        // Resolve MT5 account
        let mt5Acc = null;
        if (mt5AccountId) {
          mt5Acc = await prisma.mt5Account.findFirst({
            where: { id: mt5AccountId, userId },
          });
          if (!mt5Acc) return NextResponse.json({ error: "MT5 account not found" }, { status: 400 });
        }

        const mt5Login = mt5Acc?.mt5Login || user.mt5Account;

        const tx = await prisma.$transaction(async (p) => {
          const transaction = await p.transaction.create({
            data: {
              userId,
              type: "deposit",
              amount,
              currency: "USD",
              status: "completed",
              paymentMethod: "admin_manual",
              mt5AccountId: mt5Acc?.id || undefined,
              notes: comment || `Admin manual deposit to MT5: ${mt5Login || "N/A"}`,
              adminComment: "Admin manual deposit",
            },
          });
          await p.auditLog.create({
            data: { adminId: "admin", action: "ADMIN_CLIENT_DEPOSIT", entity: "transaction", entityId: transaction.id, details: `Admin deposited $${amount} to client ${user.name} MT5: ${mt5Login || "N/A"}` },
          });
          return transaction;
        });

        // Enqueue MT5 deposit as background job
        let jobId: string | undefined;
        if (mt5Login) {
          jobId = await enqueueMt5Operation({
            type: "deposit",
            mt5Login,
            amount,
            comment: `Admin deposit #${userId}`,
            transactionId: tx.id,
          });
        }

        return NextResponse.json({ success: true, transaction: tx, jobId }, { status: 202 });
      }

      case "client_withdraw": {
        if (!userId) return NextResponse.json({ error: "Client is required" }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "Client not found" }, { status: 400 });

        // Resolve MT5 account
        let mt5Acc = null;
        if (mt5AccountId) {
          mt5Acc = await prisma.mt5Account.findFirst({
            where: { id: mt5AccountId, userId },
          });
          if (!mt5Acc) return NextResponse.json({ error: "MT5 account not found" }, { status: 400 });
        }

        const mt5Login = mt5Acc?.mt5Login || user.mt5Account;

        const tx = await prisma.$transaction(async (p) => {
          const transaction = await p.transaction.create({
            data: {
              userId,
              type: "withdraw",
              amount,
              currency: "USD",
              status: "completed",
              paymentMethod: withdrawTo || "cash",
              mt5AccountId: mt5Acc?.id || undefined,
              notes: comment || `Admin manual withdrawal from MT5: ${mt5Login || "N/A"}`,
              adminComment: "Admin manual withdrawal",
            },
          });
          await p.auditLog.create({
            data: { adminId: "admin", action: "ADMIN_CLIENT_WITHDRAW", entity: "transaction", entityId: transaction.id, details: `Admin withdrew $${amount} from client ${user.name} MT5: ${mt5Login || "N/A"}` },
          });
          return transaction;
        });

        // Enqueue MT5 withdrawal as background job
        let jobId: string | undefined;
        if (mt5Login) {
          jobId = await enqueueMt5Operation({
            type: "withdraw",
            mt5Login,
            amount,
            comment: `Admin withdrawal #${userId}`,
            transactionId: tx.id,
          });
        }

        return NextResponse.json({ success: true, transaction: tx, jobId }, { status: 202 });
      }

      case "wallet_deposit": {
        // Legacy wallet deposit - now treated as MT5 deposit
        if (!userId) return NextResponse.json({ error: "Client is required" }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "Client not found" }, { status: 400 });

        let mt5Acc = null;
        if (mt5AccountId) {
          mt5Acc = await prisma.mt5Account.findFirst({
            where: { id: mt5AccountId, userId },
          });
        }

        const mt5Login = mt5Acc?.mt5Login || user.mt5Account;

        const tx = await prisma.$transaction(async (p) => {
          const transaction = await p.transaction.create({
            data: {
              userId,
              type: "deposit",
              amount,
              currency: "USD",
              status: "completed",
              paymentMethod: "admin_wallet_deposit",
              mt5AccountId: mt5Acc?.id || undefined,
              notes: comment || "Admin wallet deposit",
              adminComment: "Admin wallet deposit",
            },
          });
          await p.auditLog.create({
            data: { adminId: "admin", action: "ADMIN_WALLET_DEPOSIT", entity: "transaction", entityId: transaction.id, details: `Admin deposited $${amount} to ${user.name} MT5: ${mt5Login || "N/A"}` },
          });
          return transaction;
        });

        // Enqueue MT5 deposit as background job
        let jobId: string | undefined;
        if (mt5Login) {
          jobId = await enqueueMt5Operation({
            type: "deposit",
            mt5Login,
            amount,
            comment: `Admin wallet deposit #${userId}`,
            transactionId: tx.id,
          });
        }

        return NextResponse.json({ success: true, transaction: tx, jobId }, { status: 202 });
      }

      case "wallet_withdraw": {
        // Legacy wallet withdraw - now treated as MT5 withdrawal
        if (!userId) return NextResponse.json({ error: "Client is required" }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "Client not found" }, { status: 400 });

        let mt5Acc = null;
        if (mt5AccountId) {
          mt5Acc = await prisma.mt5Account.findFirst({
            where: { id: mt5AccountId, userId },
          });
        }

        const mt5Login = mt5Acc?.mt5Login || user.mt5Account;

        const tx = await prisma.$transaction(async (p) => {
          const transaction = await p.transaction.create({
            data: {
              userId,
              type: "withdraw",
              amount,
              currency: "USD",
              status: "completed",
              paymentMethod: "admin_wallet_withdraw",
              mt5AccountId: mt5Acc?.id || undefined,
              notes: comment || "Admin wallet withdrawal",
              adminComment: "Admin wallet withdrawal",
            },
          });
          await p.auditLog.create({
            data: { adminId: "admin", action: "ADMIN_WALLET_WITHDRAW", entity: "transaction", entityId: transaction.id, details: `Admin withdrew $${amount} from ${user.name} MT5: ${mt5Login || "N/A"}` },
          });
          return transaction;
        });

        // Enqueue MT5 withdrawal as background job
        let jobId: string | undefined;
        if (mt5Login) {
          jobId = await enqueueMt5Operation({
            type: "withdraw",
            mt5Login,
            amount,
            comment: `Admin wallet withdrawal #${userId}`,
            transactionId: tx.id,
          });
        }

        return NextResponse.json({ success: true, transaction: tx, jobId }, { status: 202 });
      }

      case "ib_withdraw": {
        if (!userId) return NextResponse.json({ error: "IB is required" }, { status: 400 });
        const ib = await prisma.user.findUnique({ where: { id: userId } });
        if (!ib || !ib.isIB) return NextResponse.json({ error: "IB not found" }, { status: 400 });
        if (ib.availableCommission < amount) {
          return NextResponse.json({ error: "Insufficient available commission" }, { status: 400 });
        }

        // Resolve target MT5 account for IB withdrawal
        let mt5Acc = null;
        if (mt5AccountId) {
          mt5Acc = await prisma.mt5Account.findFirst({
            where: { id: mt5AccountId, userId },
          });
        }

        const mt5Login = mt5Acc?.mt5Login || ib.mt5Account;

        const tx = await prisma.$transaction(async (p) => {
          const transaction = await p.transaction.create({
            data: {
              userId,
              type: "ib_withdraw",
              amount,
              currency: "USD",
              status: "completed",
              paymentMethod: withdrawTo || "mt5",
              mt5AccountId: mt5Acc?.id || undefined,
              notes: comment || `Admin IB withdrawal to MT5: ${mt5Login || "N/A"}`,
              adminComment: "Admin manual IB withdrawal",
            },
          });
          await p.user.update({
            where: { id: userId },
            data: { availableCommission: { decrement: amount } },
          });
          await p.auditLog.create({
            data: { adminId: "admin", action: "ADMIN_IB_WITHDRAW", entity: "transaction", entityId: transaction.id, details: `Admin withdrew $${amount} from IB commission to MT5: ${mt5Login || "N/A"}` },
          });
          return transaction;
        });

        // If withdrawing to MT5, enqueue deposit as background job
        let jobId: string | undefined;
        if (mt5Login && (!withdrawTo || withdrawTo === "wallet" || withdrawTo === "mt5")) {
          jobId = await enqueueMt5Operation({
            type: "deposit",
            mt5Login,
            amount,
            comment: `IB commission withdrawal #${userId}`,
            transactionId: tx.id,
          });
        }

        return NextResponse.json({ success: true, transaction: tx, jobId }, { status: 202 });
      }

      case "internal_transfer": {
        // Internal transfer between MT5 accounts
        if (!mt5AccountId || !toAccountId) {
          return NextResponse.json({ error: "Both source and destination MT5 accounts are required" }, { status: 400 });
        }

        const sourceMt5 = await prisma.mt5Account.findUnique({ where: { id: mt5AccountId } });
        const destMt5 = await prisma.mt5Account.findUnique({ where: { id: toAccountId } });
        if (!sourceMt5) return NextResponse.json({ error: "Source MT5 account not found" }, { status: 400 });
        if (!destMt5) return NextResponse.json({ error: "Destination MT5 account not found" }, { status: 400 });

        const tx = await prisma.$transaction(async (p) => {
          const transaction = await p.transaction.create({
            data: {
              userId: sourceMt5.userId,
              type: "transfer",
              amount,
              currency: "USD",
              status: "completed",
              paymentMethod: "internal_transfer",
              mt5AccountId: sourceMt5.id,
              toMt5AccountId: destMt5.id,
              notes: comment || `Admin internal transfer from MT5 ${sourceMt5.mt5Login} to ${destMt5.mt5Login}`,
              adminComment: "Admin internal transfer",
            },
          });
          await p.auditLog.create({
            data: { adminId: "admin", action: "ADMIN_INTERNAL_TRANSFER", entity: "transaction", entityId: transaction.id, details: `Admin transferred $${amount} from MT5 ${sourceMt5.mt5Login} to ${destMt5.mt5Login}` },
          });
          return transaction;
        });

        // Enqueue both MT5 operations as background jobs
        const withdrawJobId = await enqueueMt5Operation({
          type: "withdraw",
          mt5Login: sourceMt5.mt5Login,
          amount,
          comment: `Internal transfer to ${destMt5.mt5Login}`,
          transactionId: tx.id,
        });
        const depositJobId = await enqueueMt5Operation({
          type: "deposit",
          mt5Login: destMt5.mt5Login,
          amount,
          comment: `Internal transfer from ${sourceMt5.mt5Login}`,
          transactionId: tx.id,
        });

        return NextResponse.json({ success: true, transaction: tx, withdrawJobId, depositJobId }, { status: 202 });
      }

      default:
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin transaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
