import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountExists,
  getUserRecord,
  readAuthFile,
  toPublicUser,
  writeAuthFile,
} from "./auth-store";
import {
  SESSION_COOKIE,
  buildSessionPayload,
  sessionCookieOptions,
  signSession,
  verifySession,
  wantSecureCookies,
} from "./auth-session";
import type { AuthUserPublic, AuthUserRecord } from "./auth-types";
import { nowIso, uid } from "./store";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD = 8;

export { accountExists, SESSION_COOKIE };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function getSessionFromCookies(): Promise<AuthUserPublic | null> {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = await getUserRecord();
  if (!user || user.id !== payload.userId) return null;
  return toPublicUser(user);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<AuthUserPublic | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = await getUserRecord();
  if (!user || user.id !== payload.userId) return null;
  return toPublicUser(user);
}

export function attachSessionCookie(
  res: NextResponse,
  user: AuthUserRecord | AuthUserPublic,
  reqUrl?: string
): NextResponse {
  const token = signSession(buildSessionPayload(user.id, user.username));
  res.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(wantSecureCookies(reqUrl))
  );
  return res;
}

export function clearSessionCookie(res: NextResponse, reqUrl?: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(wantSecureCookies(reqUrl)),
    maxAge: 0,
  });
  return res;
}

export async function createAccount(input: {
  username: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: AuthUserPublic } | { ok: false; error: string }> {
  if (await accountExists()) {
    return { ok: false, error: "Account already configured. Sign in instead." };
  }
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  if (!username || username.length < 2) {
    return { ok: false, error: "Username must be at least 2 characters." };
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      ok: false,
      error: "Username may use letters, numbers, dots, underscores, hyphens.",
    };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const pwErr = validatePassword(input.password);
  if (pwErr) return { ok: false, error: pwErr };

  const now = nowIso();
  const user: AuthUserRecord = {
    id: uid("user"),
    username,
    email,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  await writeAuthFile({ user });
  return { ok: true, user: toPublicUser(user) };
}

export async function authenticateLogin(input: {
  identifier: string;
  password: string;
}): Promise<{ ok: true; user: AuthUserRecord } | { ok: false; error: string }> {
  const file = await readAuthFile();
  if (!file.user) {
    return { ok: false, error: "No account yet. Complete setup first." };
  }
  const id = input.identifier.trim().toLowerCase();
  const match =
    file.user.username === id || file.user.email === normalizeEmail(id);
  if (!match) {
    return { ok: false, error: "Invalid username/email or password." };
  }
  const good = await verifyPassword(input.password, file.user.passwordHash);
  if (!good) {
    return { ok: false, error: "Invalid username/email or password." };
  }
  return { ok: true, user: file.user };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const file = await readAuthFile();
  if (!file.user) return { ok: false, error: "No account configured." };
  const good = await verifyPassword(
    input.currentPassword,
    file.user.passwordHash
  );
  if (!good) return { ok: false, error: "Current password is incorrect." };
  const pwErr = validatePassword(input.newPassword);
  if (pwErr) return { ok: false, error: pwErr };
  file.user.passwordHash = await hashPassword(input.newPassword);
  file.user.updatedAt = nowIso();
  await writeAuthFile(file);
  return { ok: true };
}
