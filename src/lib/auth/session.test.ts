import { describe, it, expect } from "vitest";
import { getAuthFromHeaders, hasRole } from "@/lib/auth/session";
import { NextRequest } from "next/server";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/test"), {
    headers,
  });
}

describe("getAuthFromHeaders", () => {
  it("returns auth info when headers are present", () => {
    const req = makeRequest({
      "x-user-id": "user-123",
      "x-user-role": "admin",
      "x-user-email": "admin@test.com",
    });

    const auth = getAuthFromHeaders(req);

    expect(auth).toEqual({
      userId: "user-123",
      role: "admin",
      email: "admin@test.com",
    });
  });

  it("returns null when userId header is missing", () => {
    const req = makeRequest({
      "x-user-role": "client",
    });

    expect(getAuthFromHeaders(req)).toBeNull();
  });

  it("returns null when role header is missing", () => {
    const req = makeRequest({
      "x-user-id": "user-123",
    });

    expect(getAuthFromHeaders(req)).toBeNull();
  });

  it("returns empty email when email header is missing", () => {
    const req = makeRequest({
      "x-user-id": "user-123",
      "x-user-role": "client",
    });

    const auth = getAuthFromHeaders(req);
    expect(auth?.email).toBe("");
  });
});

describe("hasRole", () => {
  const adminAuth = { userId: "u-1", role: "admin", email: "a@test.com" };
  const clientAuth = { userId: "u-2", role: "client", email: "c@test.com" };

  it("returns true when role is in the allowed list", () => {
    expect(hasRole(adminAuth, ["admin", "sub_admin"])).toBe(true);
  });

  it("returns false when role is not in the allowed list", () => {
    expect(hasRole(clientAuth, ["admin", "sub_admin"])).toBe(false);
  });

  it("handles single-element arrays", () => {
    expect(hasRole(adminAuth, ["admin"])).toBe(true);
    expect(hasRole(clientAuth, ["admin"])).toBe(false);
  });
});
