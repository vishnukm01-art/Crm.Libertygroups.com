import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

// PATCH /api/vj-alert-rules/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { userId, userEmail } = getUserFromHeaders(req);
    const data: Record<string, unknown> = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.threshold !== undefined) data.threshold = body.threshold !== null ? parseInt(body.threshold) : null;
    if (body.recipientEmail !== undefined) data.recipientEmail = body.recipientEmail;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const rule = await prisma.vJAlertRule.update({
      where: { id: params.id },
      data,
    });
    await logVJActivity({ action: "ALERT_RULE_UPDATED", userId, userName: userEmail, entityType: "VJAlertRule", entityId: params.id, details: "Alert rule updated" });
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/vj-alert-rules/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, userEmail } = getUserFromHeaders(req);
    await prisma.vJAlertRule.delete({ where: { id: params.id } });
    await logVJActivity({ action: "ALERT_RULE_DELETED", userId, userName: userEmail, entityType: "VJAlertRule", entityId: params.id, details: "Alert rule deleted" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
