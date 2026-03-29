import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/interactions/export - Export as CSV
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = { deletedAt: null };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { agentName: { contains: search, mode: "insensitive" } },
      { transcript: { contains: search, mode: "insensitive" } },
    ];
  }

  const interactions = await prisma.interaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      customerName: true,
      agentName: true,
      direction: true,
      duration: true,
      score: true,
      sentiment: true,
      status: true,
    },
  });

  const headers = ["Date", "Customer", "Agent", "Direction", "Duration (s)", "Score", "Sentiment", "Status"];
  const rows = interactions.map((i) => [
    new Date(i.createdAt).toISOString().split("T")[0],
    (i.customerName || "Unknown").replace(/,/g, " "),
    (i.agentName || "Unknown").replace(/,/g, " "),
    i.direction || "inbound",
    String(i.duration || 0),
    String(i.score ?? ""),
    i.sentiment || "",
    i.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="voice-jar-export-${Date.now()}.csv"`,
    },
  });
}
