import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest } from "@/__tests__/helpers";
import { prisma } from "@/lib/prisma";

// Import the route handlers
import { GET, POST, DELETE } from "@/app/api/webhooks/route";

describe("GET /api/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of webhooks", async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      {
        id: "wh-1",
        url: "https://example.com/hook",
        secret: "secret",
        events: "deposit.approved",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = createMockRequest("/api/webhooks");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("wh-1");
    expect(data[0].url).toBe("https://example.com/hook");
    expect(data[0].isActive).toBe(true);
  });
});

describe("POST /api/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a webhook with valid data", async () => {
    vi.mocked(prisma.webhook.create).mockResolvedValue({
      id: "wh-new",
      url: "https://example.com/hook",
      secret: "generated-secret",
      events: "deposit.approved,user.created",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createMockRequest("/api/webhooks", {
      method: "POST",
      body: {
        url: "https://example.com/hook",
        events: ["deposit.approved", "user.created"],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("wh-new");
    expect(data.secret).toBeDefined(); // Secret shown on creation
  });

  it("rejects missing url", async () => {
    const request = createMockRequest("/api/webhooks", {
      method: "POST",
      body: { events: ["deposit.approved"] },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects empty events array", async () => {
    const request = createMockRequest("/api/webhooks", {
      method: "POST",
      body: { url: "https://example.com/hook", events: [] },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects invalid event types", async () => {
    const request = createMockRequest("/api/webhooks", {
      method: "POST",
      body: {
        url: "https://example.com/hook",
        events: ["invalid.event"],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid event types");
  });

  it("rejects invalid URL format", async () => {
    const request = createMockRequest("/api/webhooks", {
      method: "POST",
      body: {
        url: "not-a-url",
        events: ["deposit.approved"],
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid URL");
  });
});

describe("DELETE /api/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a webhook by id", async () => {
    vi.mocked(prisma.webhook.delete).mockResolvedValue({
      id: "wh-1",
      url: "https://example.com",
      secret: "s",
      events: "*",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createMockRequest("/api/webhooks", {
      method: "DELETE",
      body: { id: "wh-1" },
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("rejects missing id", async () => {
    const request = createMockRequest("/api/webhooks", {
      method: "DELETE",
      body: {},
    });

    const response = await DELETE(request);
    expect(response.status).toBe(400);
  });
});
