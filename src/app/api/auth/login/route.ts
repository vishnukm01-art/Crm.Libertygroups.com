import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user: { id: string; email: string; name: string; role: string; isIB?: boolean } | null = null;

    // Check admin credentials
    if (normalizedEmail === "admin@libertymarkets.com" && password === process.env.ADMIN_PASSWORD) {
      user = { id: "admin", email: "admin@libertymarkets.com", name: "Admin", role: "admin" };
    }
    // Check IB credentials
    else if (normalizedEmail === "ib@libertygroups.com" && password === process.env.IB_PASSWORD) {
      user = { id: "ib", email: "ib@libertygroups.com", name: "IB Manager", role: "ib" };
    }
    // Check database
    else {
      try {
        const dbUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (dbUser) {
          const isValid = await bcrypt.compare(password, dbUser.password);
          if (isValid) {
            user = { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, isIB: dbUser.isIB };
          }
        }
      } catch (e) {
        console.error("DB auth error:", e);
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create JWT session token manually
    const secret = process.env.NEXTAUTH_SECRET!;
    const token = await encode({
      token: {
        name: user.name,
        email: user.email,
        sub: user.id,
        id: user.id,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      },
      secret,
      salt: "authjs.session-token",
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, isIB: user.isIB || false } });
    
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
