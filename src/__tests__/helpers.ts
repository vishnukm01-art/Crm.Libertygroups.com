import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing API routes.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    formData?: FormData;
  } = {}
): NextRequest {
  const { method = "GET", body, headers = {}, formData } = options;

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      // Simulate middleware-injected auth headers
      "x-user-id": "test-user-id",
      "x-user-role": "admin",
      "x-user-email": "admin@test.com",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  if (formData) {
    init.body = formData as unknown as BodyInit;
    // Remove content-type so fetch auto-sets multipart boundary
    delete (init.headers as Record<string, string>)["Content-Type"];
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

/** Standard mock user object from Prisma */
export const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  password: "$2a$12$hashedpassword",
  role: "client",
  phone: "+1234567890",
  country: "US",
  status: "active",
  kycStatus: "approved",
  mt5Account: "12345",
  mt5Group: "demo",
  leverage: "1:100",
  marketingName: null,
  walletBalance: 1000,
  twoFactorEnabled: false,
  followUpStatus: null,
  followUpNote: null,
  followUpDate: null,
  referralLink: null,
  totalCommission: 0,
  availableCommission: 0,
  isIB: false,
  ibParentId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/** Standard mock transaction */
export const mockTransaction = {
  id: "tx-1",
  userId: "user-1",
  withdrawUserId: null,
  mt5AccountId: "mt5-acc-1",
  toMt5AccountId: null,
  type: "deposit",
  amount: 500,
  currency: "USD",
  status: "pending",
  paymentMethod: "Bank Transfer",
  reference: "DEP-ABC123",
  notes: null,
  proofFilePath: null,
  adminComment: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    phone: "+1234567890",
    mt5Account: "12345",
  },
  mt5AccountRef: {
    id: "mt5-acc-1",
    mt5Login: "12345",
    mt5Group: "demo",
  },
};
