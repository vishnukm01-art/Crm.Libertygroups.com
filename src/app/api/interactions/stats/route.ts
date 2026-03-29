import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/interactions/stats - Aggregated statistics
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const range = searchParams.get("range") || "all";

  const dateFilter: Record<string, unknown> = {};
  const now = new Date();
  if (range === "7d") {
    dateFilter.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  } else if (range === "30d") {
    dateFilter.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  } else if (range === "90d") {
    dateFilter.createdAt = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
  }

  const baseWhere = { deletedAt: null, ...dateFilter };

  const [
    totalCount,
    completedCount,
    avgScoreResult,
    sentimentCounts,
    agentStats,
    scoreDistribution,
  ] = await Promise.all([
    prisma.interaction.count({ where: baseWhere }),
    prisma.interaction.count({ where: { ...baseWhere, status: "COMPLETED" } }),
    prisma.interaction.aggregate({
      where: { ...baseWhere, score: { not: null } },
      _avg: { score: true },
    }),
    prisma.interaction.groupBy({
      by: ["sentiment"],
      where: { ...baseWhere, sentiment: { not: null } },
      _count: true,
    }),
    prisma.interaction.groupBy({
      by: ["agentName"],
      where: { ...baseWhere, agentName: { not: null }, score: { not: null } },
      _avg: { score: true },
      _count: true,
      orderBy: { _avg: { score: "desc" } },
    }),
    prisma.interaction.findMany({
      where: { ...baseWhere, score: { not: null } },
      select: { score: true },
    }),
  ]);

  // Build score distribution buckets
  const buckets = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
  for (const item of scoreDistribution) {
    if (item.score === null) continue;
    if (item.score <= 25) buckets["0-25"]++;
    else if (item.score <= 50) buckets["26-50"]++;
    else if (item.score <= 75) buckets["51-75"]++;
    else buckets["76-100"]++;
  }

  // Build sentiment breakdown
  const sentimentBreakdown: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const s of sentimentCounts) {
    if (s.sentiment && s.sentiment in sentimentBreakdown) {
      sentimentBreakdown[s.sentiment] = s._count;
    }
  }

  // Agent performance
  const agents = agentStats
    .filter((a) => a.agentName)
    .map((a) => ({
      name: a.agentName,
      avgScore: Math.round(a._avg.score || 0),
      totalCalls: a._count,
    }));

  return NextResponse.json({
    totalCount,
    completedCount,
    completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    avgScore: Math.round(avgScoreResult._avg.score || 0),
    sentimentBreakdown,
    scoreDistribution: buckets,
    agents,
  });
}
