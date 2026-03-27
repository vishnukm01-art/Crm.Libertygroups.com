import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/users - List all users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mt5Only = searchParams.get("mt5Only");
    const noMT5 = searchParams.get("noMT5");

    let where: any = {};
    if (mt5Only === "true") {
      where.mt5Account = { not: null };
    }
    if (noMT5 === "true") {
      where.mt5Account = null;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        kycStatus: true,
        mt5Account: true,
        mt5Group: true,
        leverage: true,
        phone: true,
        country: true,
        isIB: true,
        walletBalance: true,
        twoFactorEnabled: true,
        marketingName: true,
        createdAt: true,
        ibParent: { select: { name: true } },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, country, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone || null,
        country: country || null,
        role: role || "client",
        status: "active",
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "CREATE_USER",
        entity: "user",
        entityId: user.id,
        details: `User ${name} (${email}) created with role ${role || "client"}`,
      },
    });

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
