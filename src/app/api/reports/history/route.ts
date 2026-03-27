import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ history: [], stats: { deposit: 0, withdrawal: 0, swap: 0, commission: 0 } });
}
