import { mt5GetAccount } from "@/lib/mt5";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const login = searchParams.get("login");

    if (!login) {
      return NextResponse.json({ error: "login parameter is required" }, { status: 400 });
    }

    const result = await mt5GetAccount(login);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/mt5/account error:", error);
    return NextResponse.json({ error: "Failed to fetch MT5 account" }, { status: 500 });
  }
}
