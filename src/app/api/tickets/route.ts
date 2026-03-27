import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json(tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      priority: t.priority,
      userName: t.user.name,
      userEmail: t.user.email,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })));
  } catch (error) {
    console.error("Tickets fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    const ticket = await prisma.ticket.update({ where: { id }, data: { status } });
    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Ticket update error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
