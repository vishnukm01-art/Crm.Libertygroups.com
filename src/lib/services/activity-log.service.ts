import { prisma } from "@/lib/prisma";

export async function logVJActivity(params: {
  action: string;
  userId?: string;
  userName?: string;
  interactionId?: string;
  entityType?: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await prisma.vJActivityLog.create({ data: params });
  } catch {
    // Activity logging should never break main operations
  }
}
