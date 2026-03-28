import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAudioQueue } from "@/lib/jobs/queues";
import * as path from "path";

// POST /api/interactions/[id]/retry - Re-queue a PENDING or FAILED interaction
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: params.id },
  });

  if (!interaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!interaction.audioUrl) {
    return NextResponse.json({ error: "No audio URL" }, { status: 400 });
  }

  if (interaction.status === "PROCESSING") {
    return NextResponse.json({ error: "Already processing" }, { status: 409 });
  }

  // Reset status to PENDING
  await prisma.interaction.update({
    where: { id: params.id },
    data: { status: "PENDING", autoFailed: false, failReason: null },
  });

  // Build the audio URL for the worker
  const appUrl = process.env.APP_URL || "";
  const audioUrl = interaction.audioUrl;
  const workerAudioUrl =
    audioUrl.startsWith("/api/uploads/") && appUrl
      ? `${appUrl}${audioUrl}`
      : audioUrl.startsWith("/api/uploads/")
        ? path.join(process.cwd(), "uploads", audioUrl.replace("/api/uploads/", ""))
        : audioUrl;

  const queue = getAudioQueue();
  await queue.add("process-audio", {
    interactionId: interaction.id,
    audioUrl: workerAudioUrl,
  });

  return NextResponse.json({ success: true, status: "PENDING" });
}
