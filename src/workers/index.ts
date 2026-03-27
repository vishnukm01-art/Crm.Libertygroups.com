import { createEmailWorker } from "./email-delivery.worker";
import { createMt5Worker } from "./mt5-operations.worker";
import { createWebhookWorker } from "./webhook-delivery.worker";
import { createAudioWorker } from "./audio-processing.worker";
import { closeRedisConnection } from "../lib/jobs/connection";
import type { Worker } from "bullmq";

const workers: Worker[] = [];

function start(): void {
  console.log("[workers] Starting worker processes...");

  workers.push(createEmailWorker());
  console.log("[workers] Email delivery worker started");

  workers.push(createMt5Worker());
  console.log("[workers] MT5 operations worker started");

  workers.push(createWebhookWorker());
  console.log("[workers] Webhook delivery worker started");

  workers.push(createAudioWorker());
  console.log("[workers] Audio processing worker started");

  console.log("[workers] All workers running.");
}

async function shutdown(): Promise<void> {
  console.log("[workers] Shutting down gracefully...");

  await Promise.all(workers.map((w) => w.close()));
  await closeRedisConnection();

  console.log("[workers] Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();
