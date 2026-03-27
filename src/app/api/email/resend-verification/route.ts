import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/lib/jobs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await enqueueEmail({
      to: user.email,
      subject: "Email Verification - Liberty Markets",
      html: `<h2>Hello ${user.name},</h2><p>Please verify your email address to complete your account setup with Liberty Markets.</p><p>If you did not request this, please ignore this email.</p><br><p>Best regards,<br>Liberty Markets Team</p>`,
    });

    return NextResponse.json({ success: true, message: `Verification email queued for ${user.email}` });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
