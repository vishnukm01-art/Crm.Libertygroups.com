import { mt5GetTrades, mt5GetOpenPositions } from "@/lib/mt5";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const login = searchParams.get("login");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const type = searchParams.get("type"); // "open" for open positions, default is history

    if (!login) {
      return NextResponse.json({ error: "login parameter is required" }, { status: 400 });
    }

    if (type === "open") {
      const result = await mt5GetOpenPositions(login);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result.data);
    }

    const result = await mt5GetTrades(login, from, to);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/mt5/trades error:", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}
