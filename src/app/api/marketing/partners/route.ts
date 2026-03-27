import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const partners = await prisma.marketingPartner.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(partners);
  } catch (error) {
    console.error("Partners fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, code, commission, country } = await req.json();
    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }
    const partner = await prisma.marketingPartner.create({
      data: { name, code, commission: commission ? parseFloat(commission) : null, country: country || null },
    });
    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("Partner create error:", error);
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const partner = await prisma.marketingPartner.update({ where: { id }, data: updates });
    return NextResponse.json(partner);
  } catch (error) {
    console.error("Partner update error:", error);
    return NextResponse.json({ error: "Failed to update partner" }, { status: 500 });
  }
}
