import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const news = await prisma.news.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(news);
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, shortDescription, image, isPublished, isTrending } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }
    const item = await prisma.news.create({
      data: {
        title, content,
        shortDescription: shortDescription || null,
        image: image || null,
        isPublished: isPublished ?? false,
        isTrending: isTrending ?? false,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("News create error:", error);
    return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, title, content, shortDescription, image, isPublished, isTrending } = await req.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const item = await prisma.news.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(image !== undefined && { image }),
        ...(isPublished !== undefined && { isPublished }),
        ...(isTrending !== undefined && { isTrending }),
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("News update error:", error);
    return NextResponse.json({ error: "Failed to update news" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    await prisma.news.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("News delete error:", error);
    return NextResponse.json({ error: "Failed to delete news" }, { status: 500 });
  }
}
