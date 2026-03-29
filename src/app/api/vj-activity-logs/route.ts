import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vj-activity-logs - List activity logs
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const action = searchParams.get("action") || undefined;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;

  const [data, total] = await Promise.all([
    prisma.vJActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.vJActivityLog.count({ where }),
  ]);

  return NextResponse.json({ data, total });
}
