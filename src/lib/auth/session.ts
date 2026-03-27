import { NextRequest } from "next/server";

export interface RequestAuth {
  userId: string;
  role: string;
  email: string;
}

/**
 * Extract authentication info from middleware-injected headers.
 * Use this in API routes instead of calling getServerSession() each time.
 */
export function getAuthFromHeaders(req: NextRequest): RequestAuth | null {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  const email = req.headers.get("x-user-email");

  if (!userId || !role) {
    return null;
  }

  return { userId, role, email: email || "" };
}

/**
 * Check if the authenticated user has one of the required roles.
 */
export function hasRole(auth: RequestAuth, roles: string[]): boolean {
  return roles.includes(auth.role);
}
