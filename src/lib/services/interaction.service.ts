import { prisma } from "@/lib/prisma";
import type { InteractionStatus, Prisma } from "@prisma/client";

const fullIncludes = {
  interactionOutcomes: true,
  interactionStrengths: true,
  interactionWeaknesses: true,
  interactionMissedOpportunities: true,
};

export async function getInteractions(opts?: {
  status?: InteractionStatus;
  limit?: number;
  offset?: number;
}) {
  const { status, limit = 50, offset = 0 } = opts || {};

  const where = status ? { status } : {};

  const [data, total] = await Promise.all([
    prisma.interaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            interactionOutcomes: true,
            interactionStrengths: true,
            interactionWeaknesses: true,
            interactionMissedOpportunities: true,
          },
        },
      },
    }),
    prisma.interaction.count({ where }),
  ]);

  return { data, total };
}

export async function getFullInteraction(id: string) {
  return prisma.interaction.findUnique({
    where: { id },
    include: fullIncludes,
  });
}

export async function createInteraction(data: {
  agentName?: string;
  customerName?: string;
  direction?: string;
  audioUrl?: string;
  audioFileName?: string;
}) {
  return prisma.interaction.create({
    data: {
      type: "AUDIO",
      status: "PENDING",
      ...data,
    },
  });
}

export async function updateInteractionStatus(
  id: string,
  status: InteractionStatus,
  extra?: Record<string, unknown>
) {
  return prisma.interaction.update({
    where: { id },
    data: { status, ...extra },
  });
}

interface AnalysisItemInput {
  name: string;
  description: string;
  timeReferences: Array<{ startTime: number; endTime: number; label: string }>;
}

export async function saveAnalysisResults(
  interactionId: string,
  analysis: {
    sentiment: string;
    score: number;
    outcomes: AnalysisItemInput[];
    strengths: AnalysisItemInput[];
    weaknesses: AnalysisItemInput[];
    missedOpportunities: AnalysisItemInput[];
  }
) {
  // Delete existing records then re-create (idempotent)
  await prisma.$transaction([
    prisma.interactionOutcome.deleteMany({ where: { interactionId } }),
    prisma.interactionStrength.deleteMany({ where: { interactionId } }),
    prisma.interactionWeakness.deleteMany({ where: { interactionId } }),
    prisma.interactionMissedOpportunity.deleteMany({ where: { interactionId } }),

    ...analysis.outcomes.map((o) =>
      prisma.interactionOutcome.create({
        data: {
          interactionId,
          name: o.name,
          description: o.description,
          timeReferences: o.timeReferences.length
            ? (o.timeReferences as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
    ),
    ...analysis.strengths.map((s) =>
      prisma.interactionStrength.create({
        data: {
          interactionId,
          name: s.name,
          description: s.description,
          timeReferences: s.timeReferences.length
            ? (s.timeReferences as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
    ),
    ...analysis.weaknesses.map((w) =>
      prisma.interactionWeakness.create({
        data: {
          interactionId,
          name: w.name,
          description: w.description,
          timeReferences: w.timeReferences.length
            ? (w.timeReferences as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
    ),
    ...analysis.missedOpportunities.map((m) =>
      prisma.interactionMissedOpportunity.create({
        data: {
          interactionId,
          name: m.name,
          description: m.description,
          timeReferences: m.timeReferences.length
            ? (m.timeReferences as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
    ),
  ]);
}

export async function deleteInteraction(id: string) {
  // Cascade handles related records due to onDelete: Cascade in schema
  return prisma.interaction.delete({ where: { id } });
}
