import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  try {
    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;

    const details = await prisma.bankDetail.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(details.map((d) => ({
      id: d.id, userId: d.userId, userName: d.user.name, userEmail: d.user.email,
      bankName: d.bankName, accountNumber: d.accountNumber, ifscCode: d.ifscCode,
      swiftCode: d.swiftCode, accountType: d.accountType, status: d.status, createdAt: d.createdAt,
    })));
  } catch (error) {
    console.error("Bank details list error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, bankName, accountNumber, ifscCode, swiftCode, accountType } = body;

    if (!userId || !bankName || !accountNumber) {
      return NextResponse.json({ error: "userId, bankName, and accountNumber are required" }, { status: 400 });
    }

    const detail = await prisma.bankDetail.create({
      data: { userId, bankName, accountNumber, ifscCode, swiftCode, accountType },
    });

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Bank detail create error:", error);
    return NextResponse.json({ error: "Failed to add bank details" }, { status: 500 });
  }
}
