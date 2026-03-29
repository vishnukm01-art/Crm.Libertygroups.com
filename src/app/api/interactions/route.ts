import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAudioQueue } from "@/lib/jobs/queues";
import * as fs from "fs";
import * as path from "path";

// GET /api/interactions - List interactions
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search") || undefined;
  const saved = searchParams.get("saved");
  const trash = searchParams.get("trash");

  const where: Record<string, unknown> = {};

  // By default, exclude soft-deleted items
  if (trash === "true") {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
  }

  if (status) {
    where.status = status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  }

  if (saved === "true") {
    where.isSaved = true;
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { agentName: { contains: search, mode: "insensitive" } },
      { transcript: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.interaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            interactionOutcomes: true,
            interactionStrengths: true,
            interactionWeaknesses: true,
            interactionMissedOpportunities: true,
          },
        },
      },
    }),
    prisma.interaction.count({ where }),
  ]);

  return NextResponse.json({ data, total });
}

// POST /api/interactions - Create interaction + upload audio
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let agentName: string | undefined;
    let customerName: string | undefined;
    let direction: string | undefined;
    let audioUrl: string | undefined;
    let audioFileName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      agentName = formData.get("agentName") as string | undefined;
      customerName = formData.get("customerName") as string | undefined;
      direction = formData.get("direction") as string | undefined;

      const file = formData.get("audio") as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        audioUrl = `/api/files/${fileName}`;
        audioFileName = file.name;
      }
    } else {
      const body = await req.json();
      agentName = body.agentName;
      customerName = body.customerName;
      direction = body.direction;
      audioUrl = body.audioUrl;
      audioFileName = body.audioFileName;
    }

    const interaction = await prisma.interaction.create({
      data: {
        type: "AUDIO",
        status: "PENDING",
        agentName: agentName || null,
        customerName: customerName || null,
        direction: direction || null,
        audioUrl: audioUrl || null,
        audioFileName: audioFileName || null,
      },
    });

    // Queue audio processing if we have an audio URL
    if (audioUrl) {
      const queue = getAudioQueue();
      // For production: pass the full public URL so the worker (separate container) can download the file
      const appUrl = process.env.APP_URL || "";
      const workerAudioUrl = audioUrl.startsWith("/api/files/") && appUrl
        ? `${appUrl}${audioUrl}`
        : audioUrl.startsWith("/api/files/")
          ? path.join(process.cwd(), "uploads", audioUrl.replace("/api/files/", ""))
          : audioUrl;

      await queue.add("process-audio", {
        interactionId: interaction.id,
        audioUrl: workerAudioUrl,
      });
    }

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
