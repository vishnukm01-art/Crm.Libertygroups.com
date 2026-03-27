import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(rewards);
  } catch (error) {
    console.error("Rewards fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, type, value, minDeposit, isActive } = await req.json();
    if (!name || !type || value === undefined) {
      return NextResponse.json({ error: "Name, type, and value are required" }, { status: 400 });
    }
    const reward = await prisma.reward.create({
      data: { name, description: description || null, type, value: parseFloat(value), minDeposit: minDeposit ? parseFloat(minDeposit) : null, isActive: isActive ?? true },
    });
    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error("Reward create error:", error);
    return NextResponse.json({ error: "Failed to create reward" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const reward = await prisma.reward.update({ where: { id }, data: updates });
    return NextResponse.json(reward);
  } catch (error) {
    console.error("Reward update error:", error);
    return NextResponse.json({ error: "Failed to update reward" }, { status: 500 });
  }
}
