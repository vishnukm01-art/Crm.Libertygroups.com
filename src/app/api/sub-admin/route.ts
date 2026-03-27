import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admins = await prisma.subAdmin.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      permissions: JSON.parse(a.permissions || "[]"),
      isActive: a.isActive,
      createdAt: a.createdAt,
    })));
  } catch (error) {
    console.error("Sub admin fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, permissions } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const existing = await prisma.subAdmin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.subAdmin.create({
      data: { name, email, password: hashedPassword, permissions: JSON.stringify(permissions || []) },
    });

    return NextResponse.json({ id: admin.id, name: admin.name, email: admin.email }, { status: 201 });
  } catch (error) {
    console.error("Sub admin create error:", error);
    return NextResponse.json({ error: "Failed to create sub admin" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, permissions, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const admin = await prisma.subAdmin.update({
      where: { id },
      data: {
        ...(permissions !== undefined && { permissions: JSON.stringify(permissions) }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json(admin);
  } catch (error) {
    console.error("Sub admin update error:", error);
    return NextResponse.json({ error: "Failed to update sub admin" }, { status: 500 });
  }
}
