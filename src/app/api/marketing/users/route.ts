import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.marketingUser.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(users.map((u) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone,
      incentive: u.incentive, netDeposit: u.netDeposit, role: u.role,
      isActive: u.isActive, totalWithdraw: u.totalWithdraw,
      totalLeads: u._count.leads, createdAt: u.createdAt,
    })));
  } catch (error) {
    console.error("Marketing users error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, incentive, netDeposit, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    const existing = await prisma.marketingUser.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.marketingUser.create({
      data: { name, email, phone: phone || null, password: hashed, incentive: incentive ? parseFloat(incentive) : 0, netDeposit: netDeposit ? parseFloat(netDeposit) : 0, role: role || "team_manager" },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Marketing user create error:", error);
    return NextResponse.json({ error: "Failed to create marketing user" }, { status: 500 });
  }
}
