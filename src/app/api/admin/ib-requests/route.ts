import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;

    const requests = await prisma.iBRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true,
            country: true, mt5Account: true, status: true,
            kycStatus: true, isIB: true,
          },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("IB requests fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { requestId, action, adminComment } = await request.json();

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and action (approve/reject) are required" },
        { status: 400 }
      );
    }

    const ibRequest = await prisma.iBRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!ibRequest) {
      return NextResponse.json({ error: "IB request not found" }, { status: 404 });
    }

    if (ibRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Request is already ${ibRequest.status}` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      // Use a transaction to update both IBRequest and User atomically
      await prisma.$transaction([
        prisma.iBRequest.update({
          where: { id: requestId },
          data: {
            status: "approved",
            adminComment: adminComment || "Approved",
            reviewedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: ibRequest.userId },
          data: {
            isIB: true,
            role: "ib",
            referralLink: `${baseUrl}/register?ref=${ibRequest.userId}`,
          },
        }),
        prisma.auditLog.create({
          data: {
            adminId: "admin",
            action: "IB_REQUEST_APPROVED",
            entity: "IBRequest",
            entityId: requestId,
            details: `Approved IB application for ${ibRequest.user.name}. ${adminComment || ""}`,
          },
        }),
      ]);

      dispatchWebhookEvent("ib.request_approved", {
        requestId,
        userId: ibRequest.userId,
        userName: ibRequest.user.name,
        approvedAt: new Date().toISOString(),
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "IB application approved successfully",
        status: "approved",
      });
    } else {
      // Reject
      await prisma.$transaction([
        prisma.iBRequest.update({
          where: { id: requestId },
          data: {
            status: "rejected",
            adminComment: adminComment || "Rejected",
            reviewedAt: new Date(),
          },
        }),
        prisma.auditLog.create({
          data: {
            adminId: "admin",
            action: "IB_REQUEST_REJECTED",
            entity: "IBRequest",
            entityId: requestId,
            details: `Rejected IB application for ${ibRequest.user.name}. Reason: ${adminComment || "No reason provided"}`,
          },
        }),
      ]);

      dispatchWebhookEvent("ib.request_rejected", {
        requestId,
        userId: ibRequest.userId,
        userName: ibRequest.user.name,
        reason: adminComment || "No reason provided",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "IB application rejected",
        status: "rejected",
      });
    }
  } catch (error) {
    console.error("IB request action error:", error);
    return NextResponse.json({ error: "Failed to process IB request" }, { status: 500 });
  }
}
