import { createHmac, timingSafeEqual } from "crypto";
import type { SessionPayload } from "./auth-types";

export const SESSION_COOKIE = "bp_session";
const SESSION_DAYS = 30;

/** Shared by Node APIs and Edge middleware — keep in sync with middleware.ts */
export function getSessionSecret(): string {
  const fromSession = process.env.SESSION_SECRET?.trim();
  if (fromSession) return fromSession;
  const fromMaster = process.env.SECRETS_MASTER_KEY?.trim();
  if (fromMaster) return fromMaster;
  // Local/dev fallback (same string must be used in middleware)
  return "bipolar-local-session-dev-key";
}

export function sessionMaxAgeSec(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function signSession(payload: SessionPayload, secret = getSessionSecret()): string {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifySession(
  token: string | undefined | null,
  secret = getSessionSecret()
): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  let got: Buffer;
  try {
    got = fromB64url(sig);
  } catch {
    return null;
  }
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload?.userId || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildSessionPayload(
  userId: string,
  username: string
): SessionPayload {
  const exp = Math.floor(Date.now() / 1000) + sessionMaxAgeSec();
  return { userId, username, exp };
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionMaxAgeSec(),
  };
}

export function wantSecureCookies(reqUrl?: string): boolean {
  if (process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1") {
    return true;
  }
  if (process.env.COOKIE_SECURE === "false" || process.env.COOKIE_SECURE === "0") {
    return false;
  }
  if (reqUrl?.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}
