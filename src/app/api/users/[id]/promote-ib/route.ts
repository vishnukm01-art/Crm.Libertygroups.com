import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.isIB) return NextResponse.json({ error: "User is already an IB" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        isIB: true,
        role: "ib",
        referralLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/register?ref=${params.id}`,
      },
    });

    await prisma.auditLog.create({
      data: { adminId: "admin", action: "PROMOTE_TO_IB", entity: "User", entityId: params.id, details: `Promoted ${user.name} to IB` },
    });

    dispatchWebhookEvent("ib.request_approved", {
      userId: params.id,
      userName: user.name,
      promotedAt: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({ success: true, user: { id: updated.id, name: updated.name, isIB: updated.isIB, role: updated.role } });
  } catch (error) {
    console.error("Promote IB error:", error);
    return NextResponse.json({ error: "Failed to promote user" }, { status: 500 });
  }
}
