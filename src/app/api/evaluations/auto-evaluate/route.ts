import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  evaluateTranscriptAgainstScorecard,
  type ScorecardCriteriaInput,
} from "@/lib/ai/openai";
import { saveAIEvaluation } from "@/lib/services/evaluation.service";

// POST /api/evaluations/auto-evaluate
// Trigger AI evaluation for a specific interaction with a specific (or default) template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interactionId, templateId } = body;

    if (!interactionId) {
      return NextResponse.json(
        { error: "interactionId is required" },
        { status: 400 }
      );
    }

    // Fetch the interaction transcript
    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId },
      select: { id: true, transcript: true, status: true },
    });

    if (!interaction) {
      return NextResponse.json(
        { error: "Interaction not found" },
        { status: 404 }
      );
    }

    if (!interaction.transcript) {
      return NextResponse.json(
        { error: "Interaction has no transcript yet" },
        { status: 400 }
      );
    }

    // Fetch template (specified or default)
    const template = templateId
      ? await prisma.scorecardTemplate.findUnique({
          where: { id: templateId },
          include: {
            criteria: {
              orderBy: { sortOrder: "asc" },
              include: { questions: { orderBy: { sortOrder: "asc" } } },
            },
          },
        })
      : await prisma.scorecardTemplate.findFirst({
          where: { isDefault: true, isActive: true },
          include: {
            criteria: {
              orderBy: { sortOrder: "asc" },
              include: { questions: { orderBy: { sortOrder: "asc" } } },
            },
          },
        });

    if (!template) {
      return NextResponse.json(
        {
          error: templateId
            ? "Template not found"
            : "No default template configured",
        },
        { status: 404 }
      );
    }

    // Filter criteria that have questions
    const criteriaWithQuestions = template.criteria.filter(
      (c) => c.questions.length > 0
    );

    if (criteriaWithQuestions.length === 0) {
      return NextResponse.json(
        { error: "Template has no questions to evaluate" },
        { status: 400 }
      );
    }

    // Build criteria input for AI
    const criteriaInput: ScorecardCriteriaInput[] = criteriaWithQuestions.map(
      (c) => ({
        criteriaId: c.id,
        name: c.name,
        weight: c.weight,
        questions: c.questions.map((q) => ({
          questionId: q.id,
          text: q.text,
          maxPoints: q.maxPoints,
        })),
      })
    );

    // Run AI evaluation
    const result = await evaluateTranscriptAgainstScorecard(
      interaction.transcript,
      criteriaInput
    );

    // Save the evaluation
    const evaluation = await saveAIEvaluation(
      interactionId,
      template.id,
      template,
      result
    );

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
