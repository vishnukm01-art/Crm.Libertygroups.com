import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WEBHOOK_EVENTS, isValidWebhookEvent } from "@/lib/webhooks/events";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// GET /api/webhooks - List all webhooks
export async function GET() {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("GET /api/webhooks error:", error);
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

// POST /api/webhooks - Create a new webhook subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, events } = body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "url and events (non-empty array) are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Validate event types
    const invalidEvents = events.filter((e: string) => e !== "*" && !isValidWebhookEvent(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid event types: ${invalidEvents.join(", ")}`,
          validEvents: WEBHOOK_EVENTS,
        },
        { status: 400 }
      );
    }

    // Generate a signing secret
    const secret = randomBytes(32).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        url,
        secret,
        events: events.join(","),
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret, // Only shown once at creation time
        events: webhook.events.split(","),
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/webhooks error:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}

// DELETE /api/webhooks - Delete a webhook
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.webhook.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/webhooks error:", error);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}
