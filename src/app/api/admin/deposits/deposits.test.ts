import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, mockTransaction } from "@/__tests__/helpers";
import { prisma } from "@/lib/prisma";
import { enqueueMt5Operation, enqueueEmail } from "@/lib/jobs";
import { dispatchWebhookEvent } from "@/lib/webhooks";

import { PATCH } from "@/app/api/admin/deposits/[id]/route";

describe("PATCH /api/admin/deposits/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves a pending deposit and enqueues MT5 + email jobs", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      ...mockTransaction,
      status: "pending",
      type: "deposit",
    } as unknown as Awaited<ReturnType<typeof prisma.transaction.findUnique>>);
    vi.mocked(prisma.transaction.update).mockResolvedValue({} as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const request = createMockRequest("/api/admin/deposits/tx-1", {
      method: "PATCH",
      body: { action: "approve", comment: "Looks good" },
    });

    const response = await PATCH(request, { params: { id: "tx-1" } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe("approved");

    // Should enqueue MT5 deposit
    expect(enqueueMt5Operation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "deposit",
        mt5Login: "12345",
        amount: 500,
        transactionId: "tx-1",
      })
    );

    // Should enqueue email
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: expect.stringContaining("Deposit"),
      })
    );

    // Should dispatch webhook
    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "deposit.approved",
      expect.objectContaining({ transactionId: "tx-1" })
    );
  });

  it("rejects a pending deposit and dispatches webhook", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      ...mockTransaction,
      status: "pending",
      type: "deposit",
    } as unknown as Awaited<ReturnType<typeof prisma.transaction.findUnique>>);
    vi.mocked(prisma.transaction.update).mockResolvedValue({} as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const request = createMockRequest("/api/admin/deposits/tx-1", {
      method: "PATCH",
      body: { action: "reject", comment: "Suspicious" },
    });

    const response = await PATCH(request, { params: { id: "tx-1" } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("rejected");

    // Should NOT enqueue MT5 or email
    expect(enqueueMt5Operation).not.toHaveBeenCalled();
    expect(enqueueEmail).not.toHaveBeenCalled();

    // Should dispatch webhook
    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "deposit.rejected",
      expect.objectContaining({ transactionId: "tx-1" })
    );
  });

  it("returns 400 for invalid action", async () => {
    const request = createMockRequest("/api/admin/deposits/tx-1", {
      method: "PATCH",
      body: { action: "invalid" },
    });

    const response = await PATCH(request, { params: { id: "tx-1" } });
    expect(response.status).toBe(400);
  });

  it("returns 404 when transaction not found", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(null);

    const request = createMockRequest("/api/admin/deposits/nonexistent", {
      method: "PATCH",
      body: { action: "approve" },
    });

    const response = await PATCH(request, { params: { id: "nonexistent" } });
    expect(response.status).toBe(404);
  });

  it("returns 400 when transaction is not a deposit", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      ...mockTransaction,
      type: "withdraw",
    } as unknown as Awaited<ReturnType<typeof prisma.transaction.findUnique>>);

    const request = createMockRequest("/api/admin/deposits/tx-1", {
      method: "PATCH",
      body: { action: "approve" },
    });

    const response = await PATCH(request, { params: { id: "tx-1" } });
    expect(response.status).toBe(400);
  });

  it("returns 400 when transaction already processed", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      ...mockTransaction,
      status: "approved",
      type: "deposit",
    } as unknown as Awaited<ReturnType<typeof prisma.transaction.findUnique>>);

    const request = createMockRequest("/api/admin/deposits/tx-1", {
      method: "PATCH",
      body: { action: "approve" },
    });

    const response = await PATCH(request, { params: { id: "tx-1" } });
    expect(response.status).toBe(400);
  });
});
