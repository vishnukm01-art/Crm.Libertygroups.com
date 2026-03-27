import { prisma } from "../prisma";
import { enqueueWebhookDelivery } from "../jobs/helpers";
import type { WebhookEventType } from "./events";

/**
 * Dispatch a webhook event to all active webhooks that subscribe to this event type.
 * This is fire-and-forget: errors are logged but never thrown.
 */
export async function dispatchWebhookEvent(
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { isActive: true },
    });

    // Filter webhooks that subscribe to this event
    const matched = webhooks.filter((wh) => {
      const events = wh.events.split(",").map((e) => e.trim());
      return events.includes(event) || events.includes("*");
    });

    if (matched.length === 0) return;

    await Promise.all(
      matched.map((wh) =>
        enqueueWebhookDelivery({
          webhookId: wh.id,
          url: wh.url,
          secret: wh.secret,
          event,
          payload: data,
        }).catch((err) => {
          console.error(`[webhooks] Failed to enqueue delivery for ${wh.id}:`, err);
        })
      )
    );
  } catch (error) {
    console.error(`[webhooks] Failed to dispatch event ${event}:`, error);
  }
}
