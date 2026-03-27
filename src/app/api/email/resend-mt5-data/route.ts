import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/lib/jobs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.mt5Account) return NextResponse.json({ error: "User does not have an MT5 account" }, { status: 400 });

    await enqueueEmail({
      to: user.email,
      subject: "Your MT5 Account Details - Liberty Markets",
      html: `<h2>Hello ${user.name},</h2><p>Here are your MT5 trading account details:</p><ul><li><strong>MT5 Login:</strong> ${user.mt5Account}</li><li><strong>Group:</strong> ${user.mt5Group || "N/A"}</li><li><strong>Leverage:</strong> ${user.leverage || "N/A"}</li><li><strong>Server:</strong> ${process.env.MT5_SERVER_HOST || "N/A"}</li></ul><p>Please keep these credentials safe.</p><br><p>Best regards,<br>Liberty Markets Team</p>`,
    });

    return NextResponse.json({ success: true, message: `MT5 data email queued for ${user.email}` });
  } catch (error) {
    console.error("Resend MT5 data error:", error);
    return NextResponse.json({ error: "Failed to send MT5 data email" }, { status: 500 });
  }
}
