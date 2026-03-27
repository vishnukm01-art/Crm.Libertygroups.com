import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next-auth/jwt
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "@/middleware";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("public paths", () => {
    it("allows /api/auth routes without token", async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const response = await middleware(makeRequest("/api/auth/login"));
      // Public paths should pass through (status 200)
      expect(response.status).toBe(200);
    });

    it("allows /api/mt5/health without token", async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const response = await middleware(makeRequest("/api/mt5/health"));
      expect(response.status).toBe(200);
    });

    it("allows /register without token", async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const response = await middleware(makeRequest("/register"));
      expect(response.status).toBe(200);
    });
  });

  describe("unauthenticated requests", () => {
    it("returns 401 for API routes when no token", async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const response = await middleware(makeRequest("/api/users"));
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Authentication required");
    });

    it("redirects to / for page routes when no token", async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const response = await middleware(makeRequest("/admin/user-management/user-list"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("callbackUrl");
    });
  });

  describe("role-based access", () => {
    it("allows admin to access /api/admin routes", async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: "admin",
        email: "admin@test.com",
        role: "admin",
        sub: "admin",
        iat: 0,
        exp: 0,
        jti: "",
      });
      const response = await middleware(makeRequest("/api/admin/deposits"));
      expect(response.status).toBe(200);
    });

    it("blocks client from accessing /api/admin routes", async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        role: "client",
        sub: "user-1",
        iat: 0,
        exp: 0,
        jti: "",
      });
      const response = await middleware(makeRequest("/api/admin/deposits"));
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Insufficient permissions");
    });

    it("allows client to access /api/portal routes", async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        role: "client",
        sub: "user-1",
        iat: 0,
        exp: 0,
        jti: "",
      });
      const response = await middleware(makeRequest("/api/portal/profile"));
      expect(response.status).toBe(200);
    });

    it("blocks client from accessing /admin pages via redirect", async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        role: "client",
        sub: "user-1",
        iat: 0,
        exp: 0,
        jti: "",
      });
      const response = await middleware(makeRequest("/admin/user-management/user-list"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/portal/deposit");
    });
  });

  describe("header injection", () => {
    it("injects x-user-id, x-user-role, x-user-email headers", async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        role: "client",
        sub: "user-1",
        iat: 0,
        exp: 0,
        jti: "",
      });
      const response = await middleware(makeRequest("/api/portal/profile"));
      expect(response.headers.get("x-user-id")).toBe("user-1");
      expect(response.headers.get("x-user-role")).toBe("client");
      expect(response.headers.get("x-user-email")).toBe("user@test.com");
    });
  });
});
