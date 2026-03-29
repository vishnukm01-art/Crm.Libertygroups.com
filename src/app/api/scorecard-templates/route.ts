import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

// GET /api/scorecard-templates - List all templates
export async function GET() {
  const templates = await prisma.scorecardTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      criteria: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
      _count: { select: { evaluations: true } },
    },
  });
  return NextResponse.json(templates);
}

// POST /api/scorecard-templates - Create template with criteria and questions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, criteria, isDefault } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json({ error: "At least one criteria is required" }, { status: 400 });
    }

    // If setting as default, unset any existing defaults
    if (isDefault) {
      await prisma.scorecardTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const { userId, userEmail } = getUserFromHeaders(req);
    const template = await prisma.scorecardTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        isDefault: isDefault || false,
        criteria: {
          create: criteria.map(
            (
              c: {
                name: string;
                description?: string;
                weight: number;
                maxScore?: number;
                questions?: Array<{ text: string; maxPoints?: number }>;
              },
              i: number
            ) => ({
              name: c.name,
              description: c.description || null,
              weight: c.weight,
              maxScore: c.maxScore || 10,
              sortOrder: i,
              questions:
                c.questions && c.questions.length > 0
                  ? {
                      create: c.questions.map((q, qi) => ({
                        text: q.text,
                        maxPoints: q.maxPoints || 5,
                        sortOrder: qi,
                      })),
                    }
                  : undefined,
            })
          ),
        },
      },
      include: {
        criteria: {
          orderBy: { sortOrder: "asc" },
          include: { questions: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    await logVJActivity({
      action: "TEMPLATE_CREATED",
      userId,
      userName: userEmail,
      entityType: "ScorecardTemplate",
      entityId: template.id,
      details: `Scorecard template '${name.trim()}' created`,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
