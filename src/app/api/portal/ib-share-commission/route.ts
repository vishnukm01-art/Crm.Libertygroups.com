import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const ibUserId = request.headers.get("x-user-id");
    if (!ibUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recipientUserId, amount, note } = await request.json();

    if (!recipientUserId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "recipient and a positive amount are required" },
        { status: 400 }
      );
    }

    if (ibUserId === recipientUserId) {
      return NextResponse.json({ error: "Cannot share commission with yourself" }, { status: 400 });
    }

    // Validate IB user
    const ib = await prisma.user.findUnique({ where: { id: ibUserId } });
    if (!ib || !ib.isIB) {
      return NextResponse.json({ error: "Invalid IB user" }, { status: 404 });
    }

    if (ib.availableCommission < amount) {
      return NextResponse.json({ error: "Insufficient commission balance" }, { status: 400 });
    }

    // Validate recipient is a direct child of this IB
    const recipient = await prisma.user.findFirst({
      where: { id: recipientUserId, ibParentId: ibUserId },
    });
    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient must be a direct referral of yours" },
        { status: 400 }
      );
    }

    // Atomic transaction: deduct from IB, credit to recipient's availableCommission
    await prisma.$transaction([
      prisma.user.update({
        where: { id: ibUserId },
        data: { availableCommission: { decrement: amount } },
      }),
      prisma.user.update({
        where: { id: recipientUserId },
        data: {
          availableCommission: { increment: amount },
          totalCommission: { increment: amount },
        },
      }),
      prisma.auditLog.create({
        data: {
          adminId: ibUserId,
          action: "IB_PORTAL_COMMISSION_SHARE",
          entity: "user",
          entityId: recipientUserId,
          details: `IB ${ib.name} shared $${amount} commission with ${recipient.name}${note ? ` — ${note}` : ""}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `$${amount} commission shared with ${recipient.name} successfully`,
    });
  } catch (error) {
    console.error("IB portal commission share error:", error);
    return NextResponse.json({ error: "Failed to share commission" }, { status: 500 });
  }
}
