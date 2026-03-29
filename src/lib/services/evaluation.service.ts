import { prisma } from "@/lib/prisma";
import {
  evaluateTranscriptAgainstScorecard,
  type ScorecardCriteriaInput,
  type ScorecardEvaluationResult,
} from "@/lib/ai/openai";

/**
 * Get the default scorecard template (isDefault=true, isActive=true)
 * with all criteria and their questions.
 */
export async function getDefaultTemplate() {
  return prisma.scorecardTemplate.findFirst({
    where: { isDefault: true, isActive: true },
    include: {
      criteria: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

/**
 * Save an AI evaluation result to the database.
 * Creates Evaluation -> EvaluationScore[] -> EvaluationQuestionScore[] records.
 */
export async function saveAIEvaluation(
  interactionId: string,
  templateId: string,
  template: {
    criteria: Array<{
      id: string;
      name: string;
      weight: number;
      maxScore: number;
      questions: Array<{ id: string; text: string; maxPoints: number }>;
    }>;
  },
  result: ScorecardEvaluationResult
) {
  // Compute weighted total score using the same formula as the manual evaluation handler
  let totalScore = 0;
  for (const cr of result.criteria) {
    const templateCriteria = template.criteria.find(
      (c) => c.id === cr.criteriaId
    );
    if (!templateCriteria) continue;

    const maxScore =
      templateCriteria.questions.length > 0
        ? templateCriteria.questions.reduce((sum, q) => sum + q.maxPoints, 0)
        : templateCriteria.maxScore;

    const normalizedScore = maxScore > 0 ? (cr.totalScore / maxScore) * 100 : 0;
    totalScore += normalizedScore * (templateCriteria.weight / 100);
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      interactionId,
      templateId,
      evaluatorId: "system",
      evaluatorName: "AI",
      evaluationType: "ai",
      status: "completed",
      totalScore: Math.round(totalScore),
      notes: result.overallNotes,
      scores: {
        create: result.criteria.map((cr) => {
          const templateCriteria = template.criteria.find(
            (c) => c.id === cr.criteriaId
          );
          return {
            criteriaId: cr.criteriaId,
            criteriaName: templateCriteria?.name || "",
            score: cr.totalScore,
            questionScores: {
              create: cr.questions.map((q) => {
                const templateQuestion = templateCriteria?.questions.find(
                  (tq) => tq.id === q.questionId
                );
                return {
                  questionId: q.questionId,
                  questionText: templateQuestion?.text || "",
                  score: q.score,
                  maxPoints: q.maxPoints,
                  passed: q.passed,
                  notes: q.notes,
                };
              }),
            },
          };
        }),
      },
    },
    include: {
      scores: { include: { questionScores: true } },
    },
  });

  return evaluation;
}

/**
 * Auto-evaluate an interaction against the default scorecard template.
 * Non-blocking: failures are caught and logged, never breaking the caller.
 */
export async function autoEvaluateInteraction(
  interactionId: string,
  transcript: string
) {
  const template = await getDefaultTemplate();
  if (!template) {
    console.log(
      `[evaluation] No default template found, skipping auto-evaluation for ${interactionId}`
    );
    return null;
  }

  // Check if there are any criteria with questions
  const criteriaWithQuestions = template.criteria.filter(
    (c) => c.questions.length > 0
  );
  if (criteriaWithQuestions.length === 0) {
    console.log(
      `[evaluation] Default template "${template.name}" has no questions, skipping auto-evaluation`
    );
    return null;
  }

  // Build the criteria input for the AI function
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

  console.log(
    `[evaluation] Auto-evaluating ${interactionId} with template "${template.name}" (${criteriaInput.length} criteria, ${criteriaInput.reduce((s, c) => s + c.questions.length, 0)} questions)`
  );

  const result = await evaluateTranscriptAgainstScorecard(
    transcript,
    criteriaInput
  );

  const evaluation = await saveAIEvaluation(
    interactionId,
    template.id,
    template,
    result
  );

  console.log(
    `[evaluation] Auto-evaluation completed for ${interactionId}: score ${evaluation.totalScore}`
  );

  return evaluation;
}
