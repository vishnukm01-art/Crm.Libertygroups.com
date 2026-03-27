import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

// We need to mock directly for this test since setup.ts mocks the barrel export
vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhook: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/jobs/helpers", () => ({
  enqueueWebhookDelivery: vi.fn().mockResolvedValue("job-id"),
}));

import { prisma } from "@/lib/prisma";
import { enqueueWebhookDelivery } from "@/lib/jobs/helpers";

describe("dispatchWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues delivery for matching webhooks", async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      {
        id: "wh-1",
        url: "https://example.com/hook",
        secret: "secret-1",
        events: "deposit.approved,withdrawal.approved",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await dispatchWebhookEvent("deposit.approved", { transactionId: "tx-1" });

    expect(enqueueWebhookDelivery).toHaveBeenCalledWith({
      webhookId: "wh-1",
      url: "https://example.com/hook",
      secret: "secret-1",
      event: "deposit.approved",
      payload: { transactionId: "tx-1" },
    });
  });

  it("does not enqueue for non-matching events", async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      {
        id: "wh-1",
        url: "https://example.com/hook",
        secret: "secret-1",
        events: "deposit.approved",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await dispatchWebhookEvent("user.created", { userId: "u-1" });

    expect(enqueueWebhookDelivery).not.toHaveBeenCalled();
  });

  it("matches wildcard (*) webhooks", async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      {
        id: "wh-all",
        url: "https://example.com/all",
        secret: "secret-all",
        events: "*",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await dispatchWebhookEvent("withdrawal.rejected", { data: "test" });

    expect(enqueueWebhookDelivery).toHaveBeenCalledTimes(1);
  });

  it("handles no active webhooks gracefully", async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([]);

    await expect(
      dispatchWebhookEvent("user.created", { userId: "u-1" })
    ).resolves.toBeUndefined();

    expect(enqueueWebhookDelivery).not.toHaveBeenCalled();
  });

  it("does not throw when enqueue fails", async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      {
        id: "wh-1",
        url: "https://example.com/hook",
        secret: "s",
        events: "user.created",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(enqueueWebhookDelivery).mockRejectedValue(new Error("Redis down"));

    await expect(
      dispatchWebhookEvent("user.created", { userId: "u-1" })
    ).resolves.toBeUndefined();
  });
});
