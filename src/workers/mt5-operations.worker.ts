import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/jobs/connection";
import type { Mt5JobData } from "../lib/jobs/types";
import { mt5Deposit, mt5Withdraw } from "../lib/mt5";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function processMt5Job(job: Job<Mt5JobData>): Promise<{ success: boolean; error?: string }> {
  const { type, mt5Login, amount, comment, transactionId } = job.data;

  try {
    let result: { success: boolean; error?: string };

    if (type === "deposit") {
      result = await mt5Deposit(mt5Login, amount, comment);
    } else {
      result = await mt5Withdraw(mt5Login, amount, comment);
    }

    if (!result.success) {
      console.error(`[mt5-worker] ${type} failed for ${mt5Login}: ${result.error}`);
      // Log the failure but don't throw - the transaction status was already updated
      await prisma.auditLog.create({
        data: {
          adminId: "system",
          action: `MT5_${type.toUpperCase()}_FAILED`,
          entity: "transaction",
          entityId: transactionId,
          details: `MT5 ${type} of $${amount} failed for ${mt5Login}: ${result.error}`,
        },
      });
      return result;
    }

    console.log(`[mt5-worker] ${type} succeeded for ${mt5Login}: $${amount}`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mt5-worker] ${type} error for ${mt5Login}:`, message);

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: `MT5_${type.toUpperCase()}_ERROR`,
        entity: "transaction",
        entityId: transactionId,
        details: `MT5 ${type} of $${amount} threw error for ${mt5Login}: ${message}`,
      },
    });

    throw error; // Re-throw so BullMQ retries
  }
}

export function createMt5Worker(): Worker {
  const concurrency = parseInt(process.env.JOB_CONCURRENCY_MT5 || "2");

  return new Worker("mt5-operations", processMt5Job, {
    connection: getRedisConnection(),
    concurrency,
  });
}
