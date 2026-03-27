import { createHmac } from "crypto";

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 */
export function computeWebhookSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
