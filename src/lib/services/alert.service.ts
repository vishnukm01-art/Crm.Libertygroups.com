import { prisma } from "@/lib/prisma";
import { getEmailQueue } from "@/lib/jobs/queues";

export async function checkAndFireAlerts(
  interactionId: string,
  score: number | null,
  sentiment: string | null
) {
  try {
    const rules = await prisma.vJAlertRule.findMany({
      where: { isActive: true },
    });

    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId },
      select: { customerName: true, agentName: true },
    });

    const emailQueue = getEmailQueue();

    for (const rule of rules) {
      let shouldAlert = false;

      if (rule.type === "LOW_SCORE" && score !== null && rule.threshold !== null) {
        shouldAlert = score < rule.threshold;
      } else if (rule.type === "NEGATIVE_SENTIMENT" && sentiment === "negative") {
        shouldAlert = true;
      } else if (rule.type === "FAILED_PROCESSING") {
        // This is called separately on failure
        continue;
      }

      if (shouldAlert) {
        await emailQueue.add("send-email", {
          to: rule.recipientEmail,
          subject: `Voice Jar Alert: ${rule.type === "LOW_SCORE" ? "Low Score" : "Negative Sentiment"} Detected`,
          html: `
            <h2>Voice Jar Alert</h2>
            <p><strong>Type:</strong> ${rule.type === "LOW_SCORE" ? `Low Score (below ${rule.threshold})` : "Negative Sentiment"}</p>
            <p><strong>Customer:</strong> ${interaction?.customerName || "Unknown"}</p>
            <p><strong>Agent:</strong> ${interaction?.agentName || "Unknown"}</p>
            ${score !== null ? `<p><strong>Score:</strong> ${score}/100</p>` : ""}
            ${sentiment ? `<p><strong>Sentiment:</strong> ${sentiment}</p>` : ""}
            <p><strong>Interaction ID:</strong> ${interactionId}</p>
          `,
        });
      }
    }
  } catch {
    // Alert failures should not break main processing
  }
}
