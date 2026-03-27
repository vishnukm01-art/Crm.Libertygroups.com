import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, country, referredBy } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters", field: "password" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) {
      return NextResponse.json({ error: "The email has already been taken.", field: "email" }, { status: 409 });
    }

    // Check duplicate phone
    if (phone) {
      const normalizedPhone = phone.replace(/\s+/g, "").trim();
      if (normalizedPhone) {
        const existingPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
        if (existingPhone) {
          return NextResponse.json({ error: "The phone number has already been taken.", field: "phone" }, { status: 409 });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Validate referral IB if provided
    let ibParentId: string | null = null;
    let ibParentName: string | null = null;
    if (referredBy) {
      const ibParent = await prisma.user.findUnique({
        where: { id: referredBy },
        select: { id: true, isIB: true, name: true },
      });
      if (ibParent && ibParent.isIB) {
        ibParentId = ibParent.id;
        ibParentName = ibParent.name;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? phone.replace(/\s+/g, "").trim() : null,
        country: country || null,
        role: "client",
        status: "pending",
        kycStatus: "pending",
        ibParentId,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: "system",
        action: "USER_REGISTER",
        entity: "user",
        entityId: user.id,
        details: `New user registration: ${name} (${email})${country ? ` from ${country}` : ""}${ibParentName ? ` — referred by IB: ${ibParentName}` : ""}`,
      },
    });

    // Fire webhook event
    dispatchWebhookEvent("user.created", {
      userId: user.id,
      name: user.name,
      email: user.email,
      country: country || null,
      ibParentId,
    }).catch(() => {});

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
