import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/groups/[id]
 * Update a group's local metadata.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, leverage, commission, isActive } = body;

    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(leverage !== undefined && { leverage }),
        ...(commission !== undefined && {
          commission: commission !== null ? parseFloat(commission) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/groups/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/groups/[id]
 * Soft-delete a group by setting isActive to false.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check if any active MT5 accounts use this group
    const accountCount = await prisma.mt5Account.count({
      where: { mt5Group: existing.name },
    });
    if (accountCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete group "${existing.name}" — ${accountCount} MT5 account(s) are using it`,
        },
        { status: 409 }
      );
    }

    await prisma.group.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/groups/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
