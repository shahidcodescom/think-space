import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bp_session";

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.SECRETS_MASTER_KEY?.trim() ||
    "bipolar-local-session-dev-key"
  );
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifySessionEdge(token: string | undefined): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(sessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body)
    );
    if (bytesToB64url(mac) !== sig) return false;
    const json = new TextDecoder().decode(b64urlToBytes(body));
    const payload = JSON.parse(json) as { exp?: number; userId?: string };
    if (!payload?.userId || !payload.exp) return false;
    if (payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/setup") return true;
  if (pathname.startsWith("/book/")) return true;
  if (pathname.startsWith("/api/book/")) return true;
  if (pathname.startsWith("/api/auth/status")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/setup")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico" || pathname === "/icon.svg") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    // Authed users skip login/setup shells
    if (pathname === "/login" || pathname === "/setup") {
      const ok = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);
      if (ok) {
        return NextResponse.redirect(new URL("/thinking-space", req.url));
      }
    }
    return NextResponse.next();
  }

  const ok = await verifySessionEdge(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets Next already isolates.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
