import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { ibUserId, recipientUserId, amount, note } = await req.json();
    if (!ibUserId || !recipientUserId || !amount || amount <= 0) {
      return NextResponse.json({ error: "IB user, recipient, and positive amount are required" }, { status: 400 });
    }

    const ib = await prisma.user.findUnique({ where: { id: ibUserId } });
    if (!ib || !ib.isIB) return NextResponse.json({ error: "Invalid IB user" }, { status: 404 });
    if (ib.availableCommission < amount) return NextResponse.json({ error: "Insufficient commission balance" }, { status: 400 });

    const recipient = await prisma.user.findUnique({ where: { id: recipientUserId } });
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

    // Deduct from IB, credit to recipient wallet
    await prisma.$transaction([
      prisma.user.update({ where: { id: ibUserId }, data: { availableCommission: { decrement: amount } } }),
      prisma.user.update({ where: { id: recipientUserId }, data: { walletBalance: { increment: amount } } }),
      prisma.auditLog.create({
        data: { adminId: ibUserId, action: "IB_COMMISSION_SHARE", entity: "user", entityId: recipientUserId, details: `IB ${ib.name} shared $${amount} commission with ${recipient.name}${note ? ` - ${note}` : ""}` },
      }),
    ]);

    return NextResponse.json({ success: true, message: `$${amount} shared successfully` });
  } catch (error) {
    console.error("IB commission share error:", error);
    return NextResponse.json({ error: "Failed to share commission" }, { status: 500 });
  }
}
