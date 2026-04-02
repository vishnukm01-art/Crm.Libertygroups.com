/**
 * MT5 Manager API Integration Layer
 *
 * This module handles all communication with the MetaTrader 5 Manager API
 * through a bridge service running on the MT5 server.
 *
 * When MT5_API_MODE=mock, it returns simulated responses for development.
 * When MT5_API_MODE=live, it communicates with the MT5 Bridge service,
 * which translates REST calls into MT5 Manager API DLL calls.
 *
 * Architecture:
 *   Vercel CRM → HTTPS + API Key → MT5 Bridge (port 6680) → Manager API DLL → MT5 Server
 */

// Allow self-signed certificates when connecting to the MT5 Bridge
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MT5_CONFIG = {
  bridgeUrl: (process.env.MT5_BRIDGE_URL || "").trim(),
  apiKey: (process.env.MT5_BRIDGE_API_KEY || "").trim(),
  mode: ((process.env.MT5_API_MODE || "mock").trim()) as "mock" | "live",
};

// ─── Types ───────────────────────────────────────────────────

export interface MT5Account {
  login: string;
  name: string;
  group: string;
  leverage: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string;
  registration: string;
}

export interface MT5TradeRecord {
  order: string;
  login: string;
  symbol: string;
  action: "buy" | "sell";
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  commission: number;
  openTime: string;
  closeTime: string;
}

export interface MT5CreateAccountParams {
  name: string;
  email: string;
  group: string;
  leverage: string;
  password: string;
  phone?: string;
  country?: string;
}

export interface MT5Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: "IP_BLOCKED" | "AUTH_FAILED" | "TIMEOUT" | "CONNECTION_ERROR" | "API_ERROR";
}

export interface MT5HealthReport {
  mode: string;
  connected: boolean;
  sessionActive: boolean;
  lastAuthAttempt: string | null;
  lastAuthResult: string;
  lastError: string;
  config: {
    host: string;
    port: string;
    login: string;
    hasPassword: boolean;
  };
  uptime: {
    successfulAuths: number;
    failedAuths: number;
    totalRequests: number;
    lastSuccessfulAuth: string | null;
  };
}

// ─── Mock Data Generator ─────────────────────────────────────

let mockLoginCounter = 70000;

function generateMockAccount(params: MT5CreateAccountParams): MT5Account {
  mockLoginCounter++;
  return {
    login: String(mockLoginCounter),
    name: params.name,
    group: params.group,
    leverage: params.leverage,
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    currency: "USD",
    registration: new Date().toISOString(),
  };
}

function generateMockTrades(login: string, count: number): MT5TradeRecord[] {
  const symbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "AUDUSD", "USDCHF"];
  const trades: MT5TradeRecord[] = [];
  for (let i = 0; i < count; i++) {
    const action = Math.random() > 0.5 ? "buy" : "sell";
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const volume = parseFloat((Math.random() * 5 + 0.01).toFixed(2));
    const openPrice = parseFloat((Math.random() * 2000 + 0.5).toFixed(5));
    const profit = parseFloat((Math.random() * 500 - 250).toFixed(2));
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    trades.push({
      order: String(100000 + i),
      login,
      symbol,
      action,
      volume,
      openPrice,
      closePrice: parseFloat((openPrice + (profit > 0 ? 0.002 : -0.002)).toFixed(5)),
      profit,
      commission: parseFloat((volume * -2).toFixed(2)),
      openTime: d.toISOString(),
      closeTime: new Date(d.getTime() + Math.random() * 86400000).toISOString(),
    });
  }
  return trades;
}

// ─── Bridge Client ───────────────────────────────────────────

// Telemetry
let lastError: string = "";
let totalRequestCount: number = 0;
let lastBridgeHealthCheck: { connected: boolean; lastKeepalive?: string } | null = null;

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Normalize PascalCase keys from .NET bridge to camelCase.
 * Handles nested objects and arrays.
 */
function normalizeBridgeResponse<T>(data: unknown): T {
  if (data === null || data === undefined) return data as T;
  if (Array.isArray(data)) return data.map((item) => normalizeBridgeResponse(item)) as T;
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      result[camelKey] = typeof value === "object" ? normalizeBridgeResponse(value) : value;
    }
    return result as T;
  }
  return data as T;
}

/**
 * Make a request to the MT5 Bridge service.
 * The bridge handles Manager API authentication and session management internally.
 */
async function bridgeRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<MT5Result<T>> {
  if (MT5_CONFIG.mode === "mock") {
    return mockFallback<T>(endpoint, body);
  }

  if (!MT5_CONFIG.bridgeUrl) {
    return { success: false, error: "MT5_BRIDGE_URL not configured", errorCode: "CONNECTION_ERROR" };
  }

  totalRequestCount++;
  const url = `${MT5_CONFIG.bridgeUrl}${endpoint}`;

  // Single retry on network errors
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": MT5_CONFIG.apiKey,
        },
        signal: controller.signal,
        cache: "no-store",
      };

      if (body && method === "POST") {
        fetchOptions.body = JSON.stringify(body);
      }

      const res = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      const responseText = await res.text();

      if (res.ok) {
        let data: T;
        try {
          data = JSON.parse(responseText) as T;
        } catch {
          data = responseText as unknown as T;
        }
        lastError = "";
        return { success: true, data };
      }

      // Map bridge HTTP errors to MT5Result error codes
      if (res.status === 401) {
        lastError = "Bridge authentication failed — check MT5_BRIDGE_API_KEY";
        return { success: false, error: lastError, errorCode: "AUTH_FAILED" };
      }

      if (res.status === 503) {
        lastError = "MT5 Bridge is not connected to MT5 server";
        return { success: false, error: lastError, errorCode: "CONNECTION_ERROR" };
      }

      // Parse error from bridge response
      let errorMsg = `Bridge returned HTTP ${res.status}`;
      try {
        const errData = JSON.parse(responseText);
        if (errData.error) errorMsg = errData.error;
        if (errData.Error) errorMsg = errData.Error;
      } catch {
        if (responseText) errorMsg += `: ${responseText.substring(0, 200)}`;
      }

      lastError = errorMsg;
      return { success: false, error: errorMsg, errorCode: "API_ERROR" };
    } catch (err) {
      const msg = (err as Error).message;

      // Retry on network errors
      if (attempt === 0 && (msg.includes("ECONNRESET") || msg.includes("ECONNREFUSED") || msg.includes("fetch failed"))) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (msg.includes("abort") || msg.includes("timeout")) {
        lastError = `Bridge request timeout after ${REQUEST_TIMEOUT_MS}ms`;
        return { success: false, error: lastError, errorCode: "TIMEOUT" };
      }

      lastError = `Bridge connection failed: ${msg}`;
      return { success: false, error: lastError, errorCode: "CONNECTION_ERROR" };
    }
  }

  return { success: false, error: "Bridge request failed after retry", errorCode: "CONNECTION_ERROR" };
}

// ─── Mock fallback ───────────────────────────────────────────

async function mockFallback<T>(endpoint: string, body?: Record<string, unknown>): Promise<MT5Result<T>> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (endpoint === "/api/user/add") {
    mockLoginCounter++;
    const mockAccount = {
      login: String(mockLoginCounter),
      name: body?.Name || "Mock User",
      group: body?.Group || "Standard",
      leverage: `1:${body?.Leverage || 100}`,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      currency: "USD",
      registration: new Date().toISOString(),
    };
    return { success: true, data: mockAccount as T };
  }

  if (endpoint.startsWith("/api/user/get")) {
    return {
      success: true,
      data: {
        login: "70001",
        name: "Mock User",
        group: "Standard",
        leverage: "1:100",
        balance: 1000,
        equity: 1000,
        margin: 0,
        freeMargin: 1000,
        currency: "USD",
        registration: new Date().toISOString(),
      } as T,
    };
  }

  if (endpoint.includes("/trade/balance")) {
    return { success: true, data: { order: String(Date.now()) } as T };
  }

  if (endpoint.includes("/user/password")) {
    return { success: true, data: { success: true } as T };
  }

  if (endpoint.includes("/user/update")) {
    return { success: true, data: { success: true } as T };
  }

  if (endpoint.includes("/history") || endpoint.includes("/position")) {
    return { success: true, data: generateMockTrades("70001", 10) as T };
  }

  if (endpoint.includes("/group/getall") || endpoint.includes("/group/total")) {
    return {
      success: true,
      data: [
        { Group: "Standard" },
        { Group: "Premium" },
        { Group: "VIP" },
      ] as T,
    };
  }

  return { success: true, data: {} as T };
}

// ─── Public API ──────────────────────────────────────────────

export async function mt5CreateAccount(params: MT5CreateAccountParams): Promise<MT5Result<MT5Account>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: generateMockAccount(params) };
  }
  const result = await bridgeRequest<MT5Account>("/api/user/add", "POST", {
    Name: params.name,
    Email: params.email,
    Group: params.group,
    Leverage: parseInt(params.leverage.replace("1:", "")),
    MainPassword: params.password,
    Phone: params.phone || "",
    Country: params.country || "",
  });
  // Normalize PascalCase bridge response to camelCase
  if (result.success && result.data) {
    result.data = normalizeBridgeResponse<MT5Account>(result.data);
    result.data.login = String(result.data.login || "");
  }
  return result;
}

export async function mt5GetAccount(login: string): Promise<MT5Result<MT5Account>> {
  if (MT5_CONFIG.mode === "mock") {
    return {
      success: true,
      data: {
        login,
        name: `MT5 User ${login}`,
        group: "Standard",
        leverage: "1:200",
        balance: parseFloat((Math.random() * 50000).toFixed(2)),
        equity: parseFloat((Math.random() * 50000).toFixed(2)),
        margin: parseFloat((Math.random() * 5000).toFixed(2)),
        freeMargin: parseFloat((Math.random() * 45000).toFixed(2)),
        currency: "USD",
        registration: new Date().toISOString(),
      },
    };
  }
  const result = await bridgeRequest<MT5Account>(`/api/user/get?login=${login}`);
  // Normalize PascalCase bridge response to camelCase
  if (result.success && result.data) {
    result.data = normalizeBridgeResponse<MT5Account>(result.data);
    // Ensure login is a string
    result.data.login = String(result.data.login || login);
    // Ensure numeric fields are numbers
    result.data.balance = Number(result.data.balance) || 0;
    result.data.equity = Number(result.data.equity) || 0;
    result.data.margin = Number(result.data.margin) || 0;
    result.data.freeMargin = Number(result.data.freeMargin) || 0;
  }
  return result;
}

export async function mt5ChangePassword(login: string, newPassword: string, type: "main" | "investor" = "main"): Promise<MT5Result<{ success: boolean }>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: { success: true } };
  }
  return bridgeRequest<{ success: boolean }>("/api/user/password/change", "POST", {
    Login: parseInt(login),
    Type: type === "main" ? 0 : 1,
    Password: newPassword,
  });
}

export async function mt5ChangeLeverage(login: string, leverage: string): Promise<MT5Result<{ success: boolean }>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: { success: true } };
  }
  return bridgeRequest<{ success: boolean }>("/api/user/update", "POST", {
    Login: parseInt(login),
    Leverage: parseInt(leverage.replace("1:", "")),
  });
}

export async function mt5ChangeGroup(login: string, group: string): Promise<MT5Result<{ success: boolean }>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: { success: true } };
  }
  return bridgeRequest<{ success: boolean }>("/api/user/update", "POST", {
    Login: parseInt(login),
    Group: group,
  });
}

export async function mt5Deposit(login: string, amount: number, comment: string): Promise<MT5Result<{ order: string }>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: { order: String(Date.now()) } };
  }
  return bridgeRequest<{ order: string }>("/api/trade/balance", "POST", {
    Login: parseInt(login),
    Type: 2,
    Balance: amount,
    Comment: comment,
  });
}

export async function mt5Withdraw(login: string, amount: number, comment: string): Promise<MT5Result<{ order: string }>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: { order: String(Date.now()) } };
  }
  return bridgeRequest<{ order: string }>("/api/trade/balance", "POST", {
    Login: parseInt(login),
    Type: 2,
    Balance: -amount,
    Comment: comment,
  });
}

export async function mt5GetTrades(login: string, from?: string, to?: string): Promise<MT5Result<MT5TradeRecord[]>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: generateMockTrades(login, 25) };
  }
  const params = new URLSearchParams({ login });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const result = await bridgeRequest<MT5TradeRecord[]>(`/api/history/get?${params.toString()}`);
  // Normalize PascalCase bridge response to camelCase
  if (result.success && result.data) {
    result.data = normalizeBridgeResponse<MT5TradeRecord[]>(result.data);
  }
  return result;
}

export async function mt5GetOpenPositions(login: string): Promise<MT5Result<MT5TradeRecord[]>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: generateMockTrades(login, 5) };
  }
  return bridgeRequest<MT5TradeRecord[]>(`/api/position/get?login=${login}`);
}

export async function mt5GetGroups(): Promise<MT5Result<{ name: string; description?: string }[]>> {
  if (MT5_CONFIG.mode === "mock") {
    return {
      success: true,
      data: [
        { name: "Standard" },
        { name: "Premium" },
        { name: "VIP" },
      ],
    };
  }

  const result = await bridgeRequest<any[]>("/api/group/getall");
  if (!result.success) {
    return { success: false, error: result.error, errorCode: result.errorCode };
  }

  // Transform group response — handle multiple field name conventions
  const groups = (result.data || [])
    .map((g: any) => ({
      name: g.Group || g.Name || g.name || g.group,
      description: g.Description || g.description,
    }))
    .filter((g: { name: string }) => g.name);

  return { success: true, data: groups };
}

export interface MT5CreateGroupParams {
  name: string;
  leverage: string;
  description?: string;
}

export async function mt5CreateGroup(params: MT5CreateGroupParams): Promise<MT5Result<{ name: string }>> {
  if (MT5_CONFIG.mode === "mock") {
    return { success: true, data: { name: params.name } };
  }
  return bridgeRequest<{ name: string }>("/api/group/add", "POST", {
    Group: params.name,
    Leverage: parseInt(params.leverage.replace("1:", "")) || 100,
    Description: params.description || "",
  });
}

// ─── Status and Health ───────────────────────────────────────

export function isMT5Live(): boolean {
  return MT5_CONFIG.mode === "live";
}

export function mt5Status(): { mode: string; connected: boolean; lastError: string; sessionActive: boolean } {
  if (MT5_CONFIG.mode === "mock") {
    return { mode: "mock", connected: true, lastError: "", sessionActive: true };
  }
  return {
    mode: MT5_CONFIG.mode,
    connected: lastBridgeHealthCheck?.connected ?? false,
    lastError,
    sessionActive: lastBridgeHealthCheck?.connected ?? false,
  };
}

export function mt5Health(): MT5HealthReport {
  const bridgeConnected = lastBridgeHealthCheck?.connected ?? false;
  return {
    mode: MT5_CONFIG.mode,
    connected: MT5_CONFIG.mode === "mock" || bridgeConnected,
    sessionActive: MT5_CONFIG.mode === "mock" || bridgeConnected,
    lastAuthAttempt: null,
    lastAuthResult: bridgeConnected ? "BRIDGE_CONNECTED" : "BRIDGE_DISCONNECTED",
    lastError,
    config: {
      host: MT5_CONFIG.bridgeUrl || "(not set)",
      port: "6680",
      login: "(managed by bridge)",
      hasPassword: !!MT5_CONFIG.apiKey,
    },
    uptime: {
      successfulAuths: 0,
      failedAuths: 0,
      totalRequests: totalRequestCount,
      lastSuccessfulAuth: lastBridgeHealthCheck?.lastKeepalive || null,
    },
  };
}

export async function mt5Diagnose(): Promise<{
  host: string;
  port: string;
  baseUrl: string;
  lastError: string;
  checks: { name: string; status: "ok" | "fail"; detail: string }[];
}> {
  const checks: { name: string; status: "ok" | "fail"; detail: string }[] = [];
  const bridgeUrl = MT5_CONFIG.bridgeUrl;

  // Check config
  if (!bridgeUrl) {
    checks.push({ name: "Configuration", status: "fail", detail: "MT5_BRIDGE_URL not set" });
    return { host: "", port: "", baseUrl: "", lastError: "MT5_BRIDGE_URL not set", checks };
  }
  checks.push({ name: "Configuration", status: "ok", detail: `Bridge URL: ${bridgeUrl}` });
  checks.push({ name: "Mode", status: "ok", detail: `Running in ${MT5_CONFIG.mode} mode` });

  if (MT5_CONFIG.mode === "mock") {
    checks.push({ name: "Bridge", status: "ok", detail: "Mock mode — bridge not needed" });
    return { host: bridgeUrl, port: "6680", baseUrl: bridgeUrl, lastError: "", checks };
  }

  // Test bridge health endpoint (no auth required)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const healthRes = await fetch(`${bridgeUrl}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const healthText = await healthRes.text();

    if (healthRes.ok) {
      const healthData = JSON.parse(healthText);
      lastBridgeHealthCheck = healthData;
      checks.push({
        name: "Bridge health",
        status: healthData.connected ? "ok" : "fail",
        detail: `Bridge reachable. Connected to MT5: ${healthData.connected}. Uptime: ${healthData.uptime || "unknown"}`,
      });

      if (!healthData.connected) {
        checks.push({
          name: "MT5 Connection",
          status: "fail",
          detail: `Bridge cannot connect to MT5: ${healthData.lastError || "unknown error"}`,
        });
      }
    } else {
      checks.push({
        name: "Bridge health",
        status: "fail",
        detail: `Bridge returned HTTP ${healthRes.status}: ${healthText.substring(0, 200)}`,
      });
    }
  } catch (err) {
    const msg = (err as Error).message;
    checks.push({
      name: "Bridge health",
      status: "fail",
      detail: `Cannot reach bridge: ${msg}`,
    });
  }

  // Test authenticated endpoint
  try {
    const groupResult = await bridgeRequest<any>("/api/group/total");
    if (groupResult.success) {
      checks.push({ name: "Bridge API (authenticated)", status: "ok", detail: "API key accepted, request successful" });
    } else {
      checks.push({
        name: "Bridge API (authenticated)",
        status: "fail",
        detail: groupResult.error || "Request failed",
      });
    }
  } catch (err) {
    checks.push({
      name: "Bridge API (authenticated)",
      status: "fail",
      detail: (err as Error).message,
    });
  }

  return { host: bridgeUrl, port: "6680", baseUrl: bridgeUrl, lastError: "", checks };
}
