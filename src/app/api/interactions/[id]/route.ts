import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

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
      evaluations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalScore: true,
          evaluatorName: true,
          evaluationType: true,
          createdAt: true,
          template: { select: { name: true } },
        },
      },
    },
  });

  if (!interaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(interaction);
}

// PATCH /api/interactions/[id] - Update interaction fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, isSaved } = body;
    const { userId, userEmail } = getUserFromHeaders(req);

    if (action === "trash") {
      const interaction = await prisma.interaction.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      await logVJActivity({ action: "SOFT_DELETED", userId, userName: userEmail, interactionId: params.id, details: "Interaction moved to trash" });
      return NextResponse.json(interaction);
    }

    if (action === "restore") {
      const interaction = await prisma.interaction.update({
        where: { id: params.id },
        data: { deletedAt: null },
      });
      await logVJActivity({ action: "RESTORED", userId, userName: userEmail, interactionId: params.id, details: "Interaction restored from trash" });
      return NextResponse.json(interaction);
    }

    if (isSaved !== undefined) {
      const saved = Boolean(isSaved);
      const interaction = await prisma.interaction.update({
        where: { id: params.id },
        data: { isSaved: saved },
      });
      await logVJActivity({ action: saved ? "SAVED" : "UNSAVED", userId, userName: userEmail, interactionId: params.id, details: saved ? "Interaction bookmarked" : "Interaction unbookmarked" });
      return NextResponse.json(interaction);
    }

    return NextResponse.json({ error: "No valid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/interactions/[id] - Soft-delete or permanent delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permanent = req.nextUrl.searchParams.get("permanent") === "true";
    const { userId, userEmail } = getUserFromHeaders(req);

    if (permanent) {
      await prisma.interaction.delete({ where: { id: params.id } });
      await logVJActivity({ action: "PERMANENT_DELETED", userId, userName: userEmail, interactionId: params.id, details: "Interaction permanently deleted" });
    } else {
      await prisma.interaction.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      await logVJActivity({ action: "SOFT_DELETED", userId, userName: userEmail, interactionId: params.id, details: "Interaction moved to trash" });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
