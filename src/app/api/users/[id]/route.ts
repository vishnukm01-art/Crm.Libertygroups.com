import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { dispatchWebhookEvent } from "@/lib/webhooks";

// GET /api/users/[id] - Get a specific user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const details = searchParams.get("details");

    if (details === "true") {
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
          deposits: { orderBy: { createdAt: "desc" } },
          withdrawals: { orderBy: { createdAt: "desc" } },
          mt5Accounts: { orderBy: { createdAt: "desc" } },
          bankDetails: { orderBy: { createdAt: "desc" } },
          ibParent: { select: { id: true, name: true, email: true } },
          ibChildren: { select: { id: true, name: true, email: true, createdAt: true, phone: true, country: true } },
        },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const { password, ...safeUser } = user;
      const totalDeposit = user.deposits
        .filter((t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed"))
        .reduce((sum, t) => sum + t.amount, 0);
      const totalWithdraw = user.withdrawals
        .filter((t) => t.status === "approved" || t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);
      return NextResponse.json({
        ...safeUser,
        totalDeposit,
        totalWithdraw,
        totalMT5Accounts: user.mt5Accounts.length,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        kycStatus: true,
        mt5Account: true,
        mt5Group: true,
        leverage: true,
        phone: true,
        country: true,
        isIB: true,
        marketingName: true,
        walletBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, phone, country, status, kycStatus, role, marketingName } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (status !== undefined) updateData.status = status;
    if (kycStatus !== undefined) updateData.kycStatus = kycStatus;
    if (role !== undefined) updateData.role = role;
    if (marketingName !== undefined) updateData.marketingName = marketingName;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "UPDATE_USER",
        entity: "user",
        entityId: params.id,
        details: `Updated fields: ${Object.keys(updateData).join(", ")}`,
      },
    });

    // Dispatch appropriate webhook events
    if (kycStatus === "approved") {
      dispatchWebhookEvent("user.kyc_approved", {
        userId: params.id,
        kycStatus: "approved",
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    } else if (kycStatus === "rejected") {
      dispatchWebhookEvent("user.kyc_rejected", {
        userId: params.id,
        kycStatus: "rejected",
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    } else {
      dispatchWebhookEvent("user.updated", {
        userId: params.id,
        updatedFields: Object.keys(updateData),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.user.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "DELETE_USER",
        entity: "user",
        entityId: params.id,
        details: `User ${params.id} deleted`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
