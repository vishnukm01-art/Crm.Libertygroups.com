import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/jobs/connection";
import type { EmailJobData } from "../lib/jobs/types";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, html } = job.data;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[email-worker] SMTP not configured, skipping: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: `"Liberty Markets CRM" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`[email-worker] Sent email to ${to}: ${subject}`);
}

export function createEmailWorker(): Worker {
  const concurrency = parseInt(process.env.JOB_CONCURRENCY_EMAIL || "3");

  return new Worker("email-delivery", processEmailJob, {
    connection: getRedisConnection(),
    concurrency,
  });
}
