import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const news = await prisma.news.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        shortDescription: true,
        image: true,
        isPublished: true,
        isTrending: true,
        createdAt: true,
      },
    });

    return NextResponse.json(news);
  } catch (error) {
    console.error("Fetch news error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
