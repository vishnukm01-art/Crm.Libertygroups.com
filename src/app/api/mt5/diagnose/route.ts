import { NextResponse } from 'next/server';
import { mt5Diagnose } from '@/lib/mt5';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let outboundIp = "unknown";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      if (ipRes.ok) outboundIp = (await ipRes.json()).ip;
    } catch { outboundIp = "could not determine"; }

    const diagnosis = await mt5Diagnose();

    return NextResponse.json({
      outboundIp,
      ...diagnosis,
    });
  } catch (err) {
    return NextResponse.json({ error: `Diagnostic failed: ${(err as Error).message}` }, { status: 500 });
  }
}
