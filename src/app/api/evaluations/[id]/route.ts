import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

// GET /api/evaluations/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: {
      scores: {
        include: { questionScores: true },
      },
      template: {
        include: {
          criteria: {
            orderBy: { sortOrder: "asc" },
            include: { questions: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
      interaction: {
        select: {
          id: true,
          customerName: true,
          agentName: true,
          score: true,
          sentiment: true,
          audioUrl: true,
          duration: true,
          direction: true,
          createdAt: true,
        },
      },
    },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(evaluation);
}

// DELETE /api/evaluations/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, userEmail } = getUserFromHeaders(req);
    await prisma.evaluation.delete({ where: { id: params.id } });
    await logVJActivity({ action: "EVALUATION_DELETED", userId, userName: userEmail, entityType: "Evaluation", entityId: params.id, details: "Evaluation deleted" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
