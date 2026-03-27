import { getEmailQueue, getMt5Queue, getWebhookQueue } from "./queues";
import type { EmailJobData, Mt5JobData, WebhookDeliveryJobData } from "./types";

export async function enqueueEmail(data: EmailJobData): Promise<string> {
  const job = await getEmailQueue().add("send-email", data);
  return job.id!;
}

export async function enqueueMt5Operation(data: Mt5JobData): Promise<string> {
  const job = await getMt5Queue().add(`mt5-${data.type}`, data);
  return job.id!;
}

export async function enqueueWebhookDelivery(data: WebhookDeliveryJobData): Promise<string> {
  const job = await getWebhookQueue().add("deliver-webhook", data);
  return job.id!;
}
