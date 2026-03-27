import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/interaction-lists/[id]/interactions - Add interaction to list
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { interactionId, notes } = body;

    if (!interactionId) {
      return NextResponse.json({ error: "interactionId is required" }, { status: 400 });
    }

    // Check list exists
    const list = await prisma.interactionList.findUnique({ where: { id: params.id } });
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check interaction exists
    const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
    if (!interaction) {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }

    const item = await prisma.interactionListItem.upsert({
      where: {
        listId_interactionId: {
          listId: params.id,
          interactionId,
        },
      },
      update: { notes: notes || null },
      create: {
        listId: params.id,
        interactionId,
        notes: notes || null,
      },
      include: {
        interaction: {
          select: {
            id: true,
            agentName: true,
            customerName: true,
            score: true,
            sentiment: true,
          },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/interaction-lists/[id]/interactions - Remove interaction from list
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { interactionId } = body;

    if (!interactionId) {
      return NextResponse.json({ error: "interactionId is required" }, { status: 400 });
    }

    await prisma.interactionListItem.delete({
      where: {
        listId_interactionId: {
          listId: params.id,
          interactionId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}
