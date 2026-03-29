import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logVJActivity } from "@/lib/services/activity-log.service";
import { getUserFromHeaders } from "@/lib/utils/request-context";

// GET /api/agents/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(agent);
}

// PATCH /api/agents/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { userId, userEmail } = getUserFromHeaders(req);
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.email !== undefined) data.email = body.email || null;
    if (body.department !== undefined) data.department = body.department || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data,
    });
    await logVJActivity({ action: "AGENT_UPDATED", userId, userName: userEmail, entityType: "Agent", entityId: params.id, details: `Agent '${agent.name}' updated` });
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/agents/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, userEmail } = getUserFromHeaders(req);
    await prisma.agent.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    await logVJActivity({ action: "AGENT_DELETED", userId, userName: userEmail, entityType: "Agent", entityId: params.id, details: "Agent deactivated" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
