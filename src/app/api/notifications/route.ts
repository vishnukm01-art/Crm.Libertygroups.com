import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { userNotifications: true } } },
    });

    return NextResponse.json(notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      recipients: n._count.userNotifications,
      createdAt: n.createdAt,
    })));
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, message, type, userIds } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: { title, message, type: type || "general" },
    });

    // If specific users, send to them; otherwise send to all active users
    let targetUsers: string[] = userIds || [];
    if (!targetUsers.length) {
      const users = await prisma.user.findMany({ where: { status: "active" }, select: { id: true } });
      targetUsers = users.map((u) => u.id);
    }

    if (targetUsers.length > 0) {
      await prisma.userNotification.createMany({
        data: targetUsers.map((userId) => ({
          userId,
          notificationId: notification.id,
        })),
      });
    }

    return NextResponse.json({ success: true, notification, recipientCount: targetUsers.length }, { status: 201 });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
