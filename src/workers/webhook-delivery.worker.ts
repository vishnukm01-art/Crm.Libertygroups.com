import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/jobs/connection";
import type { WebhookDeliveryJobData } from "../lib/jobs/types";
import { computeWebhookSignature } from "../lib/webhooks/signature";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function processWebhookDelivery(job: Job<WebhookDeliveryJobData>): Promise<void> {
  const { webhookId, url, secret, event, payload } = job.data;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = computeWebhookSignature(body, secret);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": event,
    },
    body,
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[webhook-worker] Delivery to ${url} failed: ${response.status} ${text.slice(0, 200)}`);

    // If all retries exhausted, deactivate the webhook
    if (job.attemptsMade >= (job.opts.attempts || 5) - 1) {
      console.warn(`[webhook-worker] Deactivating webhook ${webhookId} after exhausted retries`);
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { isActive: false },
      }).catch(() => {});
    }

    throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
  }

  console.log(`[webhook-worker] Delivered ${event} to ${url}`);
}

export function createWebhookWorker(): Worker {
  const concurrency = parseInt(process.env.JOB_CONCURRENCY_WEBHOOK || "5");

  return new Worker("webhook-delivery", processWebhookDelivery, {
    connection: getRedisConnection(),
    concurrency,
  });
}
