import { NextRequest, NextResponse } from "next/server";
import { getAllQueues } from "@/lib/jobs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    const queueName = request.nextUrl.searchParams.get("queue");

    const queues = getAllQueues();
    const searchQueues = queueName
      ? queues.filter((q) => q.name === queueName)
      : queues;

    for (const queue of searchQueues) {
      const job = await queue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        return NextResponse.json({
          id: job.id,
          queue: queue.name,
          status: state,
          progress: job.progress,
          result: job.returnvalue,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
          attemptsMade: job.attemptsMade,
        });
      }
    }

    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/jobs/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
