import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, mockUser } from "@/__tests__/helpers";
import { prisma } from "@/lib/prisma";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashed"),
  },
}));

import { GET, POST } from "@/app/api/users/route";

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        role: "client",
        status: "active",
        kycStatus: "approved",
        mt5Account: "12345",
        mt5Group: "demo",
        leverage: "1:100",
        phone: "+1234567890",
        country: "US",
        isIB: false,
        walletBalance: 1000,
        twoFactorEnabled: false,
        marketingName: null,
        createdAt: new Date(),
        ibParent: null,
      },
    ] as any);

    const request = createMockRequest("/api/users");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].email).toBe("test@example.com");
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user",
      name: "New User",
      email: "new@example.com",
      role: "client",
      password: "$2a$12$hashed",
      status: "active",
      phone: null,
      country: null,
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

    const request = createMockRequest("/api/users", {
      method: "POST",
      body: {
        name: "New User",
        email: "new@example.com",
        password: "securePassword",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe("New User");
    expect(data.email).toBe("new@example.com");
  });

  it("returns 400 for missing required fields", async () => {
    const request = createMockRequest("/api/users", {
      method: "POST",
      body: { name: "No email" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const request = createMockRequest("/api/users", {
      method: "POST",
      body: {
        name: "Dup",
        email: "test@example.com",
        password: "password",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
