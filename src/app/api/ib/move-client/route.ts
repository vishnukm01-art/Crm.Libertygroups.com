import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId, newIbId } = await req.json();

    if (!userId || !newIbId) {
      return NextResponse.json({ error: "userId and newIbId are required" }, { status: 400 });
    }

    const [user, ib] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: newIbId } }),
    ]);

    if (!user) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (!ib || !ib.isIB) return NextResponse.json({ error: "Target IB not found or not an IB" }, { status: 404 });

    await prisma.user.update({
      where: { id: userId },
      data: { ibParentId: newIbId },
    });

    await prisma.auditLog.create({
      data: {
        adminId: "admin", action: "MOVE_CLIENT_TO_IB", entity: "User",
        entityId: userId, details: `Moved ${user.name} to IB ${ib.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Move client error:", error);
    return NextResponse.json({ error: "Failed to move client" }, { status: 500 });
  }
}
