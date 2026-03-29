import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";

// GET /api/evaluations - List evaluations
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const interactionId = searchParams.get("interactionId") || undefined;
  const status = searchParams.get("status") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (interactionId) where.interactionId = interactionId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        template: { select: { name: true } },
        interaction: {
          select: { customerName: true, agentName: true, score: true },
        },
        _count: { select: { scores: true } },
      },
    }),
    prisma.evaluation.count({ where }),
  ]);

  return NextResponse.json({ data, total });
}

// POST /api/evaluations - Create evaluation with scores
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interactionId, templateId, evaluatorId, evaluatorName, scores, notes } = body;

    if (!interactionId || !templateId) {
      return NextResponse.json({ error: "interactionId and templateId are required" }, { status: 400 });
    }

    // Get template criteria for weighted score calculation
    const template = await prisma.scorecardTemplate.findUnique({
      where: { id: templateId },
      include: { criteria: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Calculate weighted total score
    let totalScore = 0;
    let totalWeight = 0;
    const scoreData = (scores || []).map((s: { criteriaId: string; score: number; notes?: string }) => {
      const criteria = template.criteria.find((c) => c.id === s.criteriaId);
      if (criteria) {
        const normalizedScore = (s.score / criteria.maxScore) * 100;
        totalScore += normalizedScore * (criteria.weight / 100);
        totalWeight += criteria.weight;
      }
      return {
        criteriaId: s.criteriaId,
        criteriaName: criteria?.name || "Unknown",
        score: s.score,
        notes: s.notes || null,
      };
    });

    const finalScore = totalWeight > 0 ? Math.round(totalScore) : null;

    const evaluation = await prisma.evaluation.create({
      data: {
        interactionId,
        templateId,
        evaluatorId: evaluatorId || "system",
        evaluatorName: evaluatorName || null,
        evaluationType: "manual",
        status: "completed",
        totalScore: finalScore,
        notes: notes || null,
        scores: {
          create: scoreData,
        },
      },
      include: {
        scores: true,
        template: { select: { name: true } },
      },
    });

    await logVJActivity({
      action: "EVALUATION_COMPLETED",
      userId: evaluatorId,
      userName: evaluatorName,
      interactionId,
      entityType: "Evaluation",
      entityId: evaluation.id,
      details: `Evaluation completed using template "${template.name}" with score ${finalScore}`,
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
