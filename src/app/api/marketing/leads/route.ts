import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: { marketingUser: { select: { name: true, email: true } } },
    });
    return NextResponse.json(leads.map((l) => ({
      id: l.id, name: l.name, email: l.email, phone: l.phone,
      country: l.country, status: l.status, notes: l.notes,
      marketingUserName: l.marketingUser.name, createdAt: l.createdAt,
    })));
  } catch (error) {
    console.error("Leads fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support bulk upload
    if (Array.isArray(body.leads)) {
      const created = await prisma.lead.createMany({ data: body.leads });
      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    const { name, email, phone, country, marketingUserId, notes } = body;
    if (!name || !email || !marketingUserId) {
      return NextResponse.json({ error: "Name, email, and marketing user are required" }, { status: 400 });
    }
    const lead = await prisma.lead.create({
      data: { name, email, phone: phone || null, country: country || null, marketingUserId, notes: notes || null },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Lead create error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
