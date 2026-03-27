import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/interactions/[id] - Get single interaction with full details
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: params.id },
    include: {
      interactionOutcomes: true,
      interactionStrengths: true,
      interactionWeaknesses: true,
      interactionMissedOpportunities: true,
    },
  });

  if (!interaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(interaction);
}

// DELETE /api/interactions/[id] - Delete interaction
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.interaction.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
