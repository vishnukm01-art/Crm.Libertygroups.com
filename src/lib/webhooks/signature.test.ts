import { describe, it, expect } from "vitest";
import { computeWebhookSignature } from "@/lib/webhooks/signature";
import { createHmac } from "crypto";

describe("computeWebhookSignature", () => {
  it("produces a valid HMAC-SHA256 hex digest", () => {
    const payload = '{"event":"test","data":{}}';
    const secret = "my-secret";

    const result = computeWebhookSignature(payload, secret);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    expect(result).toBe(expected);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns different signatures for different secrets", () => {
    const payload = '{"event":"test"}';
    const sig1 = computeWebhookSignature(payload, "secret-a");
    const sig2 = computeWebhookSignature(payload, "secret-b");

    expect(sig1).not.toBe(sig2);
  });

  it("returns different signatures for different payloads", () => {
    const secret = "same-secret";
    const sig1 = computeWebhookSignature('{"a":1}', secret);
    const sig2 = computeWebhookSignature('{"b":2}', secret);

    expect(sig1).not.toBe(sig2);
  });

  it("returns the same signature for the same input", () => {
    const payload = '{"event":"deposit.approved"}';
    const secret = "consistent-secret";

    const sig1 = computeWebhookSignature(payload, secret);
    const sig2 = computeWebhookSignature(payload, secret);

    expect(sig1).toBe(sig2);
  });
});
