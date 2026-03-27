import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mt5GetGroups } from "@/lib/mt5";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/groups
 * Returns all groups from the local database.
 * Optionally syncs from MT5 first if ?sync=true is passed.
 */
export async function GET(request: NextRequest) {
  try {
    const sync = request.nextUrl.searchParams.get("sync") === "true";

    if (sync) {
      // Fetch groups from MT5 and upsert into local DB
      const mt5Result = await mt5GetGroups();
      if (mt5Result.success && mt5Result.data) {
        for (const g of mt5Result.data) {
          if (!g.name) continue;
          await prisma.group.upsert({
            where: { name: g.name },
            update: {}, // Don't overwrite local edits on sync
            create: {
              name: g.name,
              description: g.description || null,
              isActive: true,
            },
          });
        }
      }
    }

    const groups = await prisma.group.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Count users per group
    const groupsWithCounts = await Promise.all(
      groups.map(async (g) => {
        const userCount = await prisma.mt5Account.count({
          where: { mt5Group: g.name },
        });
        return {
          id: g.id,
          name: g.name,
          description: g.description,
          leverage: g.leverage,
          commission: g.commission,
          isActive: g.isActive,
          users: userCount,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        };
      })
    );

    return NextResponse.json(groupsWithCounts);
  } catch (error) {
    console.error("GET /api/admin/groups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups
 * Create a new group in the local database.
 * Also attempts to create it on MT5 via the bridge if supported.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, leverage, commission } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check for duplicate
    const existing = await prisma.group.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      );
    }

    // Create in local database
    const group = await prisma.group.create({
      data: {
        name: trimmedName,
        description: description || null,
        leverage: leverage || null,
        commission: commission ? parseFloat(commission) : null,
        isActive: true,
      },
    });

    // Attempt to create on MT5 via bridge (best-effort)
    let mt5Synced = false;
    let mt5Error: string | null = null;
    try {
      const { mt5CreateGroup } = await import("@/lib/mt5");
      const mt5Result = await mt5CreateGroup({
        name: trimmedName,
        leverage: leverage || "1:100",
        description: description || "",
      });
      mt5Synced = mt5Result.success;
      if (!mt5Result.success) {
        mt5Error = mt5Result.error || "Unknown MT5 error";
      }
    } catch {
      mt5Error = "MT5 bridge group creation not available";
    }

    return NextResponse.json({
      ...group,
      mt5Synced,
      mt5Error,
    });
  } catch (error) {
    console.error("POST /api/admin/groups error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
