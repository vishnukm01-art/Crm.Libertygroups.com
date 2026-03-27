import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest } from "@/__tests__/helpers";
import { prisma } from "@/lib/prisma";
import { dispatchWebhookEvent } from "@/lib/webhooks";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashed"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user successfully", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user",
      name: "John Doe",
      email: "john@example.com",
      password: "$2a$12$hashed",
      role: "client",
      phone: null,
      country: null,
      status: "pending",
      kycStatus: "pending",
      mt5Account: null,
      mt5Group: null,
      leverage: null,
      marketingName: null,
      walletBalance: 0,
      twoFactorEnabled: false,
      followUpStatus: null,
      followUpNote: null,
      followUpDate: null,
      referralLink: null,
      totalCommission: 0,
      availableCommission: 0,
      isIB: false,
      ibParentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const request = createMockRequest("/api/auth/register", {
      method: "POST",
      body: {
        name: "John Doe",
        email: "john@example.com",
        password: "securePass123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.userId).toBe("new-user");

    // Should dispatch user.created webhook
    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "user.created",
      expect.objectContaining({ userId: "new-user" })
    );
  });

  it("returns 400 for missing required fields", async () => {
    const request = createMockRequest("/api/auth/register", {
      method: "POST",
      body: { name: "John", email: "john@example.com" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const request = createMockRequest("/api/auth/register", {
      method: "POST",
      body: { name: "John", email: "john@example.com", password: "12345" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing",
    } as any);

    const request = createMockRequest("/api/auth/register", {
      method: "POST",
      body: {
        name: "John",
        email: "existing@example.com",
        password: "securePass",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
