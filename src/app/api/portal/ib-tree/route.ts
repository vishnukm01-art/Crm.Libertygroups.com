import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isIB: true },
    });
    if (!user || !user.isIB) {
      return NextResponse.json({ error: "User is not an IB" }, { status: 403 });
    }

    // Build tree recursively with max depth
    const buildTree = async (parentId: string, depth: number): Promise<unknown[]> => {
      if (depth > 5) return [];

      const children = await prisma.user.findMany({
        where: { ibParentId: parentId },
        select: { id: true, name: true, email: true, isIB: true, status: true, mt5Account: true, createdAt: true },
      });

      const result = [];
      for (const child of children) {
        const subChildren = await buildTree(child.id, depth + 1);
        result.push({
          ...child,
          level: depth,
          children: subChildren,
        });
      }
      return result;
    };

    const tree = await buildTree(userId, 1);

    return NextResponse.json({
      root: { id: user.id, name: user.name, email: user.email, isIB: true },
      children: tree,
    });
  } catch (error) {
    console.error("Fetch IB tree error:", error);
    return NextResponse.json({ error: "Failed to fetch IB tree" }, { status: 500 });
  }
}
