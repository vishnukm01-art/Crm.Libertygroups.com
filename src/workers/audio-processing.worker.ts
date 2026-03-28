import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/jobs/connection";
import type { AudioProcessingJobData } from "../lib/jobs/types";
import { PrismaClient } from "@prisma/client";
import {
  transcribeAudioWithTimestamps,
  buildTimestampedTranscript,
  analyseTranscript,
  generateStructuredSummary,
} from "../lib/ai/openai";
import { saveAnalysisResults } from "../lib/services/interaction.service";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function processAudioJob(job: Job<AudioProcessingJobData>): Promise<void> {
  const { interactionId, audioUrl } = job.data;

  console.log(`[audio-worker] Processing interaction ${interactionId}`);

  try {
    // Mark as processing
    await prisma.interaction.update({
      where: { id: interactionId },
      data: { status: "PROCESSING" },
    });

    // Step 1: Transcribe audio with timestamps
    await job.updateProgress(10);

    let transcript: string;
    let segments: Array<{ start: number; end: number; text: string }> = [];

    if (audioUrl.startsWith("/") || audioUrl.startsWith("./")) {
      // Local file
      const filePath = path.resolve(audioUrl);
      const fileStream = fs.createReadStream(filePath);
      const result = await transcribeAudioWithTimestamps(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fileStream as any
      );
      transcript = result.text;
      segments = result.segments;
    } else {
      // Remote URL - download first
      const encodedUrl = encodeURI(audioUrl);
      console.log(`[audio-worker] Downloading audio from: ${encodedUrl}`);
      const res = await fetch(encodedUrl);
      if (!res.ok) {
        throw new Error(`Failed to download audio: HTTP ${res.status} ${res.statusText}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
        throw new Error(`Unexpected content-type from audio URL: ${contentType} (expected audio/*)`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) {
        throw new Error(`Downloaded file too small (${buffer.length} bytes) - likely not a valid audio file`);
      }
      // Preserve original extension from URL
      const ext = path.extname(audioUrl).split("?")[0] || ".mp3";
      const tmpPath = `/tmp/audio-${interactionId}${ext}`;
      fs.writeFileSync(tmpPath, buffer);
      console.log(`[audio-worker] Downloaded ${buffer.length} bytes to ${tmpPath}`);
      const fileStream = fs.createReadStream(tmpPath);
      const result = await transcribeAudioWithTimestamps(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fileStream as any
      );
      transcript = result.text;
      segments = result.segments;
      fs.unlinkSync(tmpPath);
    }

    // Save transcript
    await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        transcript,
        transcriptJson: segments,
      },
    });

    await job.updateProgress(40);

    // Step 2: Build timestamped transcript for GPT
    const timestampedTranscript =
      segments.length > 0 ? buildTimestampedTranscript(segments) : undefined;

    // Step 3: Analyze transcript
    const analysis = await analyseTranscript(transcript, timestampedTranscript);
    await job.updateProgress(70);

    // Step 4: Generate structured summary
    const summary = await generateStructuredSummary(transcript, timestampedTranscript);
    await job.updateProgress(85);

    // Step 5: Compute duration from segments
    const duration =
      segments.length > 0 ? Math.ceil(segments[segments.length - 1].end) : undefined;

    // Step 6: Save all results
    await saveAnalysisResults(interactionId, analysis);

    await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        status: "COMPLETED",
        sentiment: analysis.sentiment,
        score: analysis.score,
        summaryJson: JSON.parse(JSON.stringify(summary)),
        duration: duration || undefined,
      },
    });

    await job.updateProgress(100);
    console.log(`[audio-worker] Completed interaction ${interactionId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[audio-worker] Failed interaction ${interactionId}:`, message);

    await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        status: "FAILED",
        autoFailed: true,
        failReason: message,
      },
    });

    throw error;
  }
}

export function createAudioWorker(): Worker {
  const concurrency = parseInt(process.env.JOB_CONCURRENCY_AUDIO || "2");

  return new Worker("audio-processing", processAudioJob, {
    connection: getRedisConnection(),
    concurrency,
  });
}
