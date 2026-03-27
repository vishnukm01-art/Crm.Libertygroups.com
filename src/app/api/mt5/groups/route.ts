import { NextResponse } from "next/server";
import { mt5GetGroups } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await mt5GetGroups();

    if (!result.success || !result.data) {
      console.error("Failed to fetch MT5 groups:", result.error);
      return NextResponse.json(
        {
          error: result.error || "Failed to fetch MT5 groups",
          errorCode: result.errorCode,
          groups: [],
        },
        { status: result.errorCode === "IP_BLOCKED" ? 503 : 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/mt5/groups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MT5 groups", groups: [] },
      { status: 500 }
    );
  }
}
