import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

// Lazy-initialized queue singletons
let emailQueue: Queue | null = null;
let mt5Queue: Queue | null = null;
let webhookQueue: Queue | null = null;
let audioQueue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue("email-delivery", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return emailQueue;
}

export function getMt5Queue(): Queue {
  if (!mt5Queue) {
    mt5Queue = new Queue("mt5-operations", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return mt5Queue;
}

export function getWebhookQueue(): Queue {
  if (!webhookQueue) {
    webhookQueue = new Queue("webhook-delivery", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { count: 2000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return webhookQueue;
}

export function getAudioQueue(): Queue {
  if (!audioQueue) {
    audioQueue = new Queue("audio-processing", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 15000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    });
  }
  return audioQueue;
}

export function getAllQueues(): Queue[] {
  return [getEmailQueue(), getMt5Queue(), getWebhookQueue(), getAudioQueue()];
}
