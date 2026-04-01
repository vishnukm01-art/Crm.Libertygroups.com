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

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updated = await prisma.document.update({
      where: { id: params.id },
      data: { status },
    });

    // Update the user's kycStatus based on their document statuses
    const allDocs = await prisma.document.findMany({
      where: { userId: doc.userId },
    });

    const hasRejected = allDocs.some((d) => d.status === "rejected");
    const allApproved = allDocs.every((d) => d.status === "approved");

    let kycStatus = "pending";
    if (hasRejected) {
      kycStatus = "rejected";
    } else if (allApproved) {
      kycStatus = "approved";
    }

    await prisma.user.update({
      where: { id: doc.userId },
      data: { kycStatus },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: `Document ${status} successfully`,
    });
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}
