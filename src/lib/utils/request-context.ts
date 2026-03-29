import { NextRequest } from "next/server";

export function getUserFromHeaders(req: NextRequest) {
  return {
    userId: req.headers.get("x-user-id") || undefined,
    userEmail: req.headers.get("x-user-email") || undefined,
  };
}
