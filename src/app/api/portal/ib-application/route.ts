import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get the user's latest IB application
    const application = await prisma.iBRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Get IB terms from settings
    const termsSetting = await prisma.setting.findUnique({
      where: { key: "ib_request_terms" },
    });

    // Get user's IB status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true },
    });

    return NextResponse.json({
      application,
      terms: termsSetting?.value || "",
      isIB: user?.isIB || false,
    });
  } catch (error) {
    console.error("IB application fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch IB application" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { reason } = await request.json();

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, isIB: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already an IB
    if (user.isIB) {
      return NextResponse.json({ error: "You are already an Introducing Broker" }, { status: 400 });
    }

    // Check for existing pending request
    const existingPending = await prisma.iBRequest.findFirst({
      where: { userId, status: "pending" },
    });
    if (existingPending) {
      return NextResponse.json({ error: "You already have a pending IB application" }, { status: 400 });
    }

    // Create the IB request
    const ibRequest = await prisma.iBRequest.create({
      data: {
        userId,
        reason: reason || null,
        status: "pending",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        action: "IB_APPLICATION_SUBMITTED",
        entity: "IBRequest",
        entityId: ibRequest.id,
        details: `${user.name} submitted IB application${reason ? `: ${reason}` : ""}`,
      },
    });

    return NextResponse.json(ibRequest, { status: 201 });
  } catch (error) {
    console.error("IB application submit error:", error);
    return NextResponse.json({ error: "Failed to submit IB application" }, { status: 500 });
  }
}
