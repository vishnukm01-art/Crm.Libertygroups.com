import { NextResponse } from 'next/server';
import { mt5Diagnose } from '@/lib/mt5';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const diag = await mt5Diagnose();

    // Get outbound IP for debugging
    let outboundIp = "unknown";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        outboundIp = ipData.ip;
      }
    } catch {
      // non-critical
    }

    const mode = (process.env.MT5_API_MODE || "mock").trim();
    const allOk = diag.checks.every((c) => c.status === "ok");
    const isHealthy = mode === "mock" || allOk;

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "unhealthy",
        mode,
        outboundIp,
        checks: diag.checks,
        lastError: diag.lastError,
        troubleshooting: !isHealthy
          ? {
              architecture: "CRM → MT5 Bridge (port 6680) → Manager API DLL → MT5 Server",
              diagnoseUrl: "/api/mt5/diagnose",
              steps: [
                "1. Verify MT5 Bridge service is running on the MT5 server (sc query MT5Bridge)",
                "2. Check bridge health: curl -k https://213.136.69.2:6680/api/health",
                "3. Ensure firewall port 6680 is open for Vercel IPs",
                "4. Verify MT5_BRIDGE_URL and MT5_BRIDGE_API_KEY are set in Vercel env vars",
                "5. Check bridge logs on the server for connection errors",
                "6. Call /api/mt5/diagnose for detailed diagnostics",
              ],
            }
          : undefined,
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: (err as Error).message },
      { status: 500 }
    );
  }
}
