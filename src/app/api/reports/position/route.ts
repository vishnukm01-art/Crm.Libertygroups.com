import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ positions: [], stats: { balance: 0, equity: 0, profit: 0, freeMargin: 0 } });
}
