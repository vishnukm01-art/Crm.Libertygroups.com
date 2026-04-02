import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/groups
 * Returns active managed groups for the Create MT5 Account modal.
 * Accessible by portal users (client, ib, admin).
 */
export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      where: { source: "manual", isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("GET /api/portal/groups error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
