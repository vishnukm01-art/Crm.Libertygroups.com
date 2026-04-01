import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    salt: "authjs.session-token",
  });

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = (token.id as string) || token.sub || "";

  // Fetch latest user data from DB (isIB can change after login)
  let isIB = false;
  let name = token.name;
  let email = token.email;
  if (userId && userId !== "admin" && userId !== "ib" && userId !== "vj-admin" && userId !== "vj-reviewer") {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { isIB: true, name: true, email: true },
      });
      if (dbUser) {
        isIB = dbUser.isIB;
        name = dbUser.name;
        email = dbUser.email;
      }
    } catch { /* use token data as fallback */ }
  }

  return NextResponse.json({
    id: userId,
    name,
    email,
    role: token.role || "client",
    isIB,
  });
}
