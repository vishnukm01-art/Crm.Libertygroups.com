import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    salt: "authjs.session-token",
  });

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    id: token.id || token.sub,
    name: token.name,
    email: token.email,
    role: token.role || "client",
  });
}
