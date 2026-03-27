import { vi } from "vitest";

// Mock environment variables
process.env.NEXTAUTH_SECRET = "test-secret-key-for-vitest";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.IB_PASSWORD = "test-ib-password";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mt5Account: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    webhook: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    bankDetail: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    userNotification: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    reward: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    bonus: {
      create: vi.fn(),
    },
    iBCommission: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    iBRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    group: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    subAdmin: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({
      transaction: { update: vi.fn() },
      auditLog: { create: vi.fn() },
      user: { update: vi.fn() },
    })),
  },
}));

// Mock BullMQ jobs
vi.mock("@/lib/jobs", () => ({
  enqueueEmail: vi.fn().mockResolvedValue("mock-job-id"),
  enqueueMt5Operation: vi.fn().mockResolvedValue("mock-job-id"),
  enqueueWebhookDelivery: vi.fn().mockResolvedValue("mock-job-id"),
  getEmailQueue: vi.fn(),
  getMt5Queue: vi.fn(),
  getWebhookQueue: vi.fn(),
  getAllQueues: vi.fn().mockReturnValue([]),
}));

// Mock webhook dispatcher
vi.mock("@/lib/webhooks", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
  WEBHOOK_EVENTS: [
    "user.created",
    "user.updated",
    "user.kyc_approved",
    "user.kyc_rejected",
    "deposit.created",
    "deposit.approved",
    "deposit.rejected",
    "withdrawal.created",
    "withdrawal.approved",
    "withdrawal.rejected",
    "mt5.account_created",
    "ib.request_approved",
    "ib.request_rejected",
    "ib.commission_calculated",
  ],
  isValidWebhookEvent: vi.fn((e: string) => [
    "user.created", "user.updated", "user.kyc_approved", "user.kyc_rejected",
    "deposit.created", "deposit.approved", "deposit.rejected",
    "withdrawal.created", "withdrawal.approved", "withdrawal.rejected",
    "mt5.account_created", "ib.request_approved", "ib.request_rejected",
    "ib.commission_calculated",
  ].includes(e)),
  computeWebhookSignature: vi.fn().mockReturnValue("mock-signature"),
}));

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "mock-id" }),
    }),
  },
}));

// Mock MT5 library
vi.mock("@/lib/mt5", () => ({
  mt5CreateAccount: vi.fn().mockResolvedValue({ success: true, data: { login: "12345" } }),
  mt5Deposit: vi.fn().mockResolvedValue({ success: true }),
  mt5Withdraw: vi.fn().mockResolvedValue({ success: true }),
  mt5GetAccount: vi.fn().mockResolvedValue({ success: true, data: { balance: 10000 } }),
  mt5GetOpenPositions: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));
