import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/interaction-lists/[id] - Get single list with items
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const list = await prisma.interactionList.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { addedAt: "desc" },
        include: {
          interaction: {
            select: {
              id: true,
              status: true,
              agentName: true,
              customerName: true,
              direction: true,
              duration: true,
              sentiment: true,
              score: true,
              audioFileName: true,
              createdAt: true,
              _count: {
                select: {
                  interactionStrengths: true,
                  interactionWeaknesses: true,
                  interactionMissedOpportunities: true,
                },
              },
            },
          },
        },
      },
      _count: { select: { items: true } },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(list);
}

// PATCH /api/interaction-lists/[id] - Update list
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, description, visibility } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (visibility !== undefined) data.visibility = visibility;

    const list = await prisma.interactionList.update({
      where: { id: params.id },
      data,
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/interaction-lists/[id] - Delete list
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.interactionList.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
