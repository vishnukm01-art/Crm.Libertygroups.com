import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, country: true,
        status: true, kycStatus: true, mt5Account: true, mt5Group: true,
        leverage: true, isIB: true, createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, phone, country } = body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(name && { name }), ...(phone !== undefined && { phone }), ...(country !== undefined && { country }) },
      select: {
        id: true, name: true, email: true, phone: true, country: true,
        status: true, kycStatus: true, mt5Account: true, mt5Group: true,
        leverage: true, isIB: true, createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
