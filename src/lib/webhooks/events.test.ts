import { describe, it, expect } from "vitest";
import { WEBHOOK_EVENTS, isValidWebhookEvent } from "@/lib/webhooks/events";

describe("WEBHOOK_EVENTS", () => {
  it("contains expected event types", () => {
    expect(WEBHOOK_EVENTS).toContain("user.created");
    expect(WEBHOOK_EVENTS).toContain("deposit.approved");
    expect(WEBHOOK_EVENTS).toContain("deposit.rejected");
    expect(WEBHOOK_EVENTS).toContain("withdrawal.approved");
    expect(WEBHOOK_EVENTS).toContain("withdrawal.rejected");
    expect(WEBHOOK_EVENTS).toContain("mt5.account_created");
  });

  it("has at least 10 event types", () => {
    expect(WEBHOOK_EVENTS.length).toBeGreaterThanOrEqual(10);
  });

  it("all events follow dot-notation format", () => {
    for (const event of WEBHOOK_EVENTS) {
      expect(event).toMatch(/^[a-z0-9]+\.[a-z_]+$/);
    }
  });
});

describe("isValidWebhookEvent", () => {
  it("returns true for valid events", () => {
    expect(isValidWebhookEvent("user.created")).toBe(true);
    expect(isValidWebhookEvent("deposit.approved")).toBe(true);
  });

  it("returns false for invalid events", () => {
    expect(isValidWebhookEvent("not.a.real.event")).toBe(false);
    expect(isValidWebhookEvent("")).toBe(false);
    expect(isValidWebhookEvent("random")).toBe(false);
  });
});
