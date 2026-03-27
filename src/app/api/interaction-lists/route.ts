import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/interaction-lists - List all lists
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const visibility = searchParams.get("visibility") || undefined;
  const tab = searchParams.get("tab") || "all";

  const where: Record<string, unknown> = {};

  if (tab === "personal") {
    where.visibility = "PERSONAL";
  } else if (tab === "public") {
    where.visibility = "PUBLIC";
  }

  if (visibility) {
    where.visibility = visibility.toUpperCase();
  }

  const lists = await prisma.interactionList.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(lists);
}

// POST /api/interaction-lists - Create a new list
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, visibility } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 });
    }

    const list = await prisma.interactionList.create({
      data: {
        name: name.trim(),
        description: description || null,
        visibility: visibility === "PUBLIC" ? "PUBLIC" : "PERSONAL",
      },
      include: {
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
