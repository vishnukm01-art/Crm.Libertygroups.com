/**
 * All supported webhook event types for the CRM.
 */
export const WEBHOOK_EVENTS = [
  "user.created",
  "user.updated",
  "user.kyc_approved",
  "user.kyc_rejected",
  "deposit.created",
  "deposit.approved",
  "deposit.rejected",
  "withdrawal.created",
  "withdrawal.approved",
  "withdrawal.rejected",
  "mt5.account_created",
  "ib.request_approved",
  "ib.request_rejected",
  "ib.commission_calculated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export function isValidWebhookEvent(event: string): event is WebhookEventType {
  return (WEBHOOK_EVENTS as readonly string[]).includes(event);
}
