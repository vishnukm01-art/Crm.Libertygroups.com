import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

// GET /api/scorecard-templates/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const template = await prisma.scorecardTemplate.findUnique({
    where: { id: params.id },
    include: {
      criteria: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
      _count: { select: { evaluations: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

// PATCH /api/scorecard-templates/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, description, criteria, isDefault } = body;
    const { userId, userEmail } = getUserFromHeaders(req);

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;

    // Handle isDefault toggle
    if (isDefault !== undefined) {
      if (isDefault) {
        await prisma.scorecardTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      data.isDefault = isDefault;
    }

    const template = await prisma.scorecardTemplate.update({
      where: { id: params.id },
      data,
    });

    // If criteria provided, replace them all (including questions)
    if (criteria && Array.isArray(criteria)) {
      // Delete old criteria (cascade deletes questions)
      await prisma.scorecardCriteria.deleteMany({
        where: { templateId: params.id },
      });

      // Create new criteria with questions
      for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i] as {
          name: string;
          description?: string;
          weight: number;
          maxScore?: number;
          questions?: Array<{ text: string; maxPoints?: number }>;
        };
        await prisma.scorecardCriteria.create({
          data: {
            templateId: params.id,
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
          },
        });
      }
    }

    const updated = await prisma.scorecardTemplate.findUnique({
      where: { id: params.id },
      include: {
        criteria: {
          orderBy: { sortOrder: "asc" },
          include: { questions: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    await logVJActivity({
      action: "TEMPLATE_UPDATED",
      userId,
      userName: userEmail,
      entityType: "ScorecardTemplate",
      entityId: params.id,
      details: `Scorecard template '${template.name}' updated`,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/scorecard-templates/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, userEmail } = getUserFromHeaders(req);
    await prisma.scorecardTemplate.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    await logVJActivity({
      action: "TEMPLATE_DELETED",
      userId,
      userName: userEmail,
      entityType: "ScorecardTemplate",
      entityId: params.id,
      details: "Scorecard template deactivated",
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
