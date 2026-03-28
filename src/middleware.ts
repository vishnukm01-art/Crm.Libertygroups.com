import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Voice Jar custom domain — clean URLs without /voice-jar prefix
const VOICE_JAR_HOSTS = ["qc.swagan.com"];

// Whitelisted IPs for reviewer role (comma-separated in env var, e.g. "1.2.3.4,5.6.7.8")
// Set VJ_REVIEWER_IPS env var on Railway when ready
function getReviewerIPs(): string[] {
  const ips = process.env.VJ_REVIEWER_IPS || "";
  return ips.split(",").map((ip) => ip.trim()).filter(Boolean);
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Routes that don't require authentication
// Paths that are public via prefix match (anything starting with these)
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/mt5/health",
  "/api/mt5/status",
  "/api/files",
  "/register",
  "/voice-jar/login",
];

// Paths that are public via exact match only
const PUBLIC_EXACT = ["/"];

// Role-based route access control
const ROLE_RULES: { prefix: string; roles: string[] }[] = [
  { prefix: "/api/admin", roles: ["admin", "sub_admin"] },
  { prefix: "/admin", roles: ["admin", "sub_admin"] },
  { prefix: "/voice-jar", roles: ["admin", "sub_admin", "vj_reviewer"] },
  { prefix: "/api/interactions", roles: ["admin", "sub_admin", "vj_reviewer"] },
  { prefix: "/api/portal", roles: ["client", "ib", "admin"] },
  { prefix: "/portal", roles: ["client", "ib", "admin"] },
  { prefix: "/api/ib", roles: ["admin", "sub_admin", "ib"] },
  { prefix: "/api/marketing", roles: ["admin", "sub_admin"] },
  { prefix: "/api/sub-admin", roles: ["admin"] },
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function getAllowedRoles(pathname: string): string[] | null {
  for (const rule of ROLE_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      return rule.roles;
    }
  }
  return null; // No role restriction (any authenticated user)
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const isVoiceJarDomain = VOICE_JAR_HOSTS.some((h) => hostname.startsWith(h));
  const { pathname } = request.nextUrl;

  // ── Voice Jar custom domain: rewrite clean URLs to /voice-jar/* ──
  if (isVoiceJarDomain && !pathname.startsWith("/voice-jar") && !pathname.startsWith("/api/") && !pathname.startsWith("/_next")) {
    // /login → /voice-jar/login
    // / → /voice-jar (dashboard)
    // /lists → /voice-jar/lists
    // /abc123 → /voice-jar/abc123
    const target = pathname === "/" ? "/voice-jar" : `/voice-jar${pathname}`;
    const rewriteUrl = new URL(target, request.url);
    rewriteUrl.search = request.nextUrl.search;
    // Use rewrite so the user sees the clean URL
    return NextResponse.rewrite(rewriteUrl);
  }

  // Skip public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Verify JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    salt: "authjs.session-token",
  });

  if (!token) {
    // API routes return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Page routes redirect to login
    // Voice Jar routes go to Voice Jar login, others go to CRM login
    if (pathname.startsWith("/voice-jar")) {
      const loginUrl = isVoiceJarDomain
        ? new URL("/login", request.url)
        : new URL("/voice-jar/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access check
  const userRole = (token.role as string) || "client";
  const allowedRoles = getAllowedRoles(pathname);

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    // Redirect non-admin users trying to access admin pages
    if (pathname.startsWith("/admin") && !["admin", "sub_admin"].includes(userRole)) {
      return NextResponse.redirect(new URL("/portal/deposit", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // IP restriction for vj_reviewer role
  if (userRole === "vj_reviewer") {
    const allowedIPs = getReviewerIPs();
    if (allowedIPs.length > 0) {
      const clientIP = getClientIP(request);
      if (!allowedIPs.includes(clientIP)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Access denied: IP not authorized" },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: "Access denied: Your IP address is not authorized to access this application." },
          { status: 403 }
        );
      }
    }
  }

  // Inject auth headers for downstream API routes
  const response = NextResponse.next();
  response.headers.set("x-user-id", token.id as string || token.sub || "");
  response.headers.set("x-user-role", userRole);
  response.headers.set("x-user-email", (token.email as string) || "");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
