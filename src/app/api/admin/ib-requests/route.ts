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
            kycStatus: true, isIB: true, ibParentId: true,
            ibParent: { select: { id: true, name: true } },
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

/**
 * PATCH - Approve or reject IB request
 * Supports: Admin, Parent IB, Master IB
 * First approver wins (race-safe via status check)
 */
export async function PATCH(request: NextRequest) {
  try {
    const reviewerId = request.headers.get("x-user-id") || "admin";
    const reviewerRole = request.headers.get("x-user-role") || "admin";

    const { requestId, action, adminComment } = await request.json();

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and action (approve/reject) are required" },
        { status: 400 }
      );
    }

    // Use a transaction to prevent race conditions (first-approver-wins)
    const result = await prisma.$transaction(async (tx) => {
      const ibRequest = await tx.iBRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true, name: true, ibParentId: true,
              ibParent: { select: { id: true, ibParentId: true } },
            },
          },
        },
      });

      if (!ibRequest) {
        throw new Error("IB request not found");
      }

      // First-approver-wins: if already processed, reject the action
      if (ibRequest.status !== "pending") {
        throw new Error(`Request is already ${ibRequest.status}`);
      }

      // Validate the reviewer is authorized
      const isAdmin = reviewerRole === "admin" || reviewerRole === "sub_admin";
      const isParentIB = ibRequest.user.ibParentId === reviewerId;

      // Walk up to find if reviewer is a master IB (grandparent or above)
      let isMasterIB = false;
      if (!isAdmin && !isParentIB && reviewerRole === "ib") {
        let checkId = ibRequest.user.ibParentId;
        for (let d = 0; d < 10 && checkId; d++) {
          if (checkId === reviewerId) {
            isMasterIB = true;
            break;
          }
          const parent = await tx.user.findUnique({
            where: { id: checkId },
            select: { ibParentId: true },
          });
          checkId = parent?.ibParentId || null;
        }
      }

      if (!isAdmin && !isParentIB && !isMasterIB) {
        throw new Error("You are not authorized to review this request");
      }

      const reviewedByRole = isAdmin ? "admin" : isParentIB ? "parent_ib" : "master_ib";

      if (action === "approve") {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

        await tx.iBRequest.update({
          where: { id: requestId },
          data: {
            status: "approved",
            adminComment: adminComment || "Approved",
            reviewedById: reviewerId,
            reviewedByRole,
            reviewedAt: new Date(),
          },
        });

        await tx.user.update({
          where: { id: ibRequest.userId },
          data: {
            isIB: true,
            role: "ib",
            referralLink: `${baseUrl}/register?ref=${ibRequest.userId}`,
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: reviewerId,
            action: "IB_REQUEST_APPROVED",
            entity: "IBRequest",
            entityId: requestId,
            details: `Approved IB application for ${ibRequest.user.name} by ${reviewedByRole}. ${adminComment || ""}`,
          },
        });

        return { success: true, status: "approved", reviewedBy: reviewedByRole };
      } else {
        await tx.iBRequest.update({
          where: { id: requestId },
          data: {
            status: "rejected",
            adminComment: adminComment || "Rejected",
            reviewedById: reviewerId,
            reviewedByRole,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: reviewerId,
            action: "IB_REQUEST_REJECTED",
            entity: "IBRequest",
            entityId: requestId,
            details: `Rejected IB application for ${ibRequest.user.name} by ${reviewedByRole}. Reason: ${adminComment || "No reason provided"}`,
          },
        });

        return { success: true, status: "rejected", reviewedBy: reviewedByRole };
      }
    });

    // Dispatch webhook outside transaction
    const eventName = result.status === "approved" ? "ib.request_approved" : "ib.request_rejected";
    dispatchWebhookEvent(eventName, {
      requestId,
      reviewedBy: result.reviewedBy,
      status: result.status,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `IB application ${result.status} successfully`,
      status: result.status,
      reviewedBy: result.reviewedBy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process IB request";
    console.error("IB request action error:", message);
    const status = message.includes("not found") ? 404
      : message.includes("already") ? 409
      : message.includes("not authorized") ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
