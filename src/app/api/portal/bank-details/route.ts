import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const bankDetails = await prisma.bankDetail.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bankDetails);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bank details" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { bankName, accountNumber, accountName, ifscCode, swiftCode, accountType, ibanNumber, bankAddress, country } = body;

    if (!bankName || !accountNumber) {
      return NextResponse.json({ error: "bankName and accountNumber are required" }, { status: 400 });
    }

    const bankDetail = await prisma.bankDetail.create({
      data: { userId, bankName, accountNumber, accountName, ifscCode, swiftCode, accountType, ibanNumber, bankAddress, country, status: "pending" },
    });

    return NextResponse.json(bankDetail, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save bank details" }, { status: 500 });
  }
}
