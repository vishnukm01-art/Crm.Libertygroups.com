import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

// GET /api/agents - List agents with aggregated stats
export async function GET() {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Get aggregated stats per agent name
  const agentStats = await prisma.interaction.groupBy({
    by: ["agentName"],
    where: { deletedAt: null, agentName: { not: null } },
    _avg: { score: true },
    _count: true,
  });

  const statsMap = new Map(
    agentStats.map((s) => [s.agentName, { avgScore: Math.round(s._avg.score || 0), totalCalls: s._count }])
  );

  const result = agents.map((agent) => ({
    ...agent,
    avgScore: statsMap.get(agent.name)?.avgScore || 0,
    totalCalls: statsMap.get(agent.name)?.totalCalls || 0,
  }));

  return NextResponse.json(result);
}

// POST /api/agents - Create agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, department } = body;
    const { userId, userEmail } = getUserFromHeaders(req);

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        email: email || null,
        department: department || null,
      },
    });

    await logVJActivity({ action: "AGENT_CREATED", userId, userName: userEmail, entityType: "Agent", entityId: agent.id, details: `Agent '${name.trim()}' added` });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An agent with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
