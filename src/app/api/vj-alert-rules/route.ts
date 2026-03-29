import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";

// GET /api/vj-alert-rules - List alert rules
export async function GET() {
  const rules = await prisma.vJAlertRule.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

// POST /api/vj-alert-rules - Create alert rule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, threshold, recipientEmail } = body;

    if (!type || !recipientEmail) {
      return NextResponse.json({ error: "type and recipientEmail are required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id") || undefined;
    const userEmail = req.headers.get("x-user-email") || undefined;

    const rule = await prisma.vJAlertRule.create({
      data: {
        type,
        threshold: threshold !== undefined ? parseInt(threshold) : null,
        recipientEmail,
        createdBy: userId,
      },
    });

    await logVJActivity({ action: "ALERT_RULE_CREATED", userId, userName: userEmail, entityType: "VJAlertRule", entityId: rule.id, details: `Alert rule '${type}' created` });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
