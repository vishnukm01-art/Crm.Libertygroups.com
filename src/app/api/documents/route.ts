import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const userId = req.nextUrl.searchParams.get("userId");

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const docs = await prisma.document.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(docs.map((d) => ({
      id: d.id, userId: d.userId, userName: d.user.name, userEmail: d.user.email,
      type: d.type, fileName: d.fileName, status: d.status, createdAt: d.createdAt,
    })));
  } catch (error) {
    console.error("Documents list error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, fileName } = body;

    if (!userId || !type || !fileName) {
      return NextResponse.json({ error: "userId, type, and fileName are required" }, { status: 400 });
    }

    const doc = await prisma.document.create({
      data: { userId, type, fileName, filePath: `/uploads/${fileName}` },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
