import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, fileName: true, status: true, createdAt: true },
    });
    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;

    if (!type || !file) {
      return NextResponse.json({ error: "type and file are required" }, { status: 400 });
    }

    // In production, upload file to cloud storage. For now, store reference.
    const filePath = `/uploads/documents/${userId}/${Date.now()}-${file.name}`;

    const document = await prisma.document.create({
      data: { userId, type, fileName: file.name, filePath, status: "pending" },
    });

    return NextResponse.json(document, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
