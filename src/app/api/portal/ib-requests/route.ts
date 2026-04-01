import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/ib-requests
 * Get pending IB requests from the current IB's downline
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true },
    });
    if (!user?.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Find all descendants of this IB
    const getAllDescendantIds = async (rootId: string): Promise<string[]> => {
      const allIds: string[] = [];
      let parents = [rootId];
      for (let d = 0; d < 10 && parents.length > 0; d++) {
        const children = await prisma.user.findMany({
          where: { ibParentId: { in: parents } },
          select: { id: true },
        });
        const childIds = children.map((c) => c.id);
        allIds.push(...childIds);
        parents = childIds;
      }
      return allIds;
    };

    const descendantIds = await getAllDescendantIds(userId);
    if (descendantIds.length === 0) {
      return NextResponse.json([]);
    }

    const requests = await prisma.iBRequest.findMany({
      where: {
        userId: { in: descendantIds },
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true,
            status: true, isIB: true,
            ibParent: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Portal IB requests error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

/**
 * PATCH /api/portal/ib-requests
 * IB approves/rejects a request from their downline
 * Proxies to the admin endpoint with IB context
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId, action, comment } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId and action required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isIB: true },
    });
    if (!user?.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Verify the request is from someone in their downline
    const ibRequest = await prisma.iBRequest.findUnique({
      where: { id: requestId },
      select: { userId: true, status: true },
    });
    if (!ibRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (ibRequest.status !== "pending") {
      return NextResponse.json({ error: `Request already ${ibRequest.status}` }, { status: 409 });
    }

    // Walk up from request user to check if they're under this IB
    let checkId: string | null = ibRequest.userId;
    let isAuthorized = false;
    for (let d = 0; d < 10 && checkId; d++) {
      const u = await prisma.user.findUnique({
        where: { id: checkId },
        select: { ibParentId: true },
      });
      if (u?.ibParentId === userId) {
        isAuthorized = true;
        break;
      }
      checkId = u?.ibParentId || null;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Not authorized to review this request" }, { status: 403 });
    }

    // Forward to the admin endpoint logic (use internal function)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const isApprove = action === "approve";

    const result = await prisma.$transaction(async (tx) => {
      // Re-check status for race safety
      const fresh = await tx.iBRequest.findUnique({ where: { id: requestId } });
      if (!fresh || fresh.status !== "pending") {
        throw new Error(`Request already ${fresh?.status || "missing"}`);
      }

      const reqUser = await tx.user.findUnique({
        where: { id: ibRequest.userId },
        select: { name: true },
      });

      if (isApprove) {
        await tx.iBRequest.update({
          where: { id: requestId },
          data: {
            status: "approved",
            adminComment: comment || "Approved by IB",
            reviewedById: userId,
            reviewedByRole: "ib",
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
            adminId: userId,
            action: "IB_REQUEST_APPROVED",
            entity: "IBRequest",
            entityId: requestId,
            details: `Approved IB application for ${reqUser?.name} by parent/master IB`,
          },
        });
        return "approved";
      } else {
        await tx.iBRequest.update({
          where: { id: requestId },
          data: {
            status: "rejected",
            adminComment: comment || "Rejected by IB",
            reviewedById: userId,
            reviewedByRole: "ib",
            reviewedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            adminId: userId,
            action: "IB_REQUEST_REJECTED",
            entity: "IBRequest",
            entityId: requestId,
            details: `Rejected IB application for ${reqUser?.name} by parent/master IB. Reason: ${comment || "N/A"}`,
          },
        });
        return "rejected";
      }
    });

    return NextResponse.json({ success: true, status: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
