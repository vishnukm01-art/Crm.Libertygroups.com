import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json();

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const detail = await prisma.bankDetail.findUnique({
      where: { id: params.id },
    });

    if (!detail) {
      return NextResponse.json({ error: "Bank detail not found" }, { status: 404 });
    }

    const updated = await prisma.bankDetail.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: `Bank details ${status} successfully`,
    });
  } catch (error) {
    console.error("Bank detail update error:", error);
    return NextResponse.json(
      { error: "Failed to update bank details" },
      { status: 500 }
    );
  }
}
