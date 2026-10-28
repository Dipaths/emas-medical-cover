import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const SESSION_COOKIE = "emas_session";
const SESSION_HOURS = 8;
export const ALL_ROLES = ["Admin", "Triage", "EventPlanning", "Dashboard"] as const;
export type AppRole = (typeof ALL_ROLES)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
  mustChangePassword: boolean;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters — set it in .env before starting the server.");
  }
  return s;
}

// ---------- passwords (scrypt) ----------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const DUMMY_HASH = hashPassword("dummy-password-for-timing");

export function verifyPassword(password: string, stored: string): boolean {
  const parts = (stored || DUMMY_HASH).split("$");
  const valid = parts.length === 3 && parts[0] === "scrypt";
  const [, saltHex, hashHex] = valid ? parts : DUMMY_HASH.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  const ok = crypto.timingSafeEqual(actual, expected);
  return ok && valid && !!stored;
}

export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 10) return "Password must be at least 10 characters.";
  if (pw.length > 200) return "Password is too long.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must contain letters and at least one number.";
  return null;
}

// ---------- signed session token ----------
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signSession(email: string): string {
  const payload = b64(JSON.stringify({ e: email, x: Date.now() + SESSION_HOURS * 3600_000 }));
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest();
  let given: Buffer;
  try { given = Buffer.from(sig, "base64url"); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof e !== "string" || typeof x !== "number" || x < Date.now()) return null;
    return e;
  } catch { return null; }
}

export function sessionCookie(token: string, clear = false) {
  return {
    name: SESSION_COOKIE,
    value: clear ? "" : token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
    path: "/",
    maxAge: clear ? 0 : SESSION_HOURS * 3600,
  };
}

export function parseRoles(raw: string): AppRole[] {
  const wanted = raw.split(",").map(r => r.trim().toLowerCase()).filter(Boolean);
  return ALL_ROLES.filter(r => wanted.includes(r.toLowerCase()));
}

// Re-reads the staff row on EVERY request, so suspending an account or changing roles takes effect immediately.
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const email = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return null;
  const row = await db.staffRole.findUnique({ where: { email } });
  if (!row || !row.active || !row.passwordHash) return null;
  return { id: row.id, email: row.email, name: row.name, roles: parseRoles(row.roles), mustChangePassword: row.mustChangePassword };
}

type Guard = { ok: true; user: SessionUser } | { ok: false; res: NextResponse };

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

/**
 * Call at the top of EVERY API handler.
 *  - 401 when not signed in, 403 when the role is wrong, 403 on cross-site writes (CSRF),
 *  - 403 "password_change_required" until a temporary password has been changed.
 * Admin passes every role check.
 */
export async function guard(req: NextRequest, roles: AppRole[], opts: { allowPendingPasswordChange?: boolean } = {}): Promise<Guard> {
  if (!["GET", "HEAD"].includes(req.method) && !sameOrigin(req)) {
    return { ok: false, res: NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 }) };
  }
  const user = await getSessionUser(req);
  if (!user) return { ok: false, res: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (user.mustChangePassword && !opts.allowPendingPasswordChange) {
    return { ok: false, res: NextResponse.json({ error: "password_change_required" }, { status: 403 }) };
  }
  if (roles.length && !user.roles.includes("Admin") && !roles.some(r => user.roles.includes(r))) {
    await audit(req, user.email, "access.denied", `${req.method} ${req.nextUrl.pathname}`, `needs one of: ${roles.join(",")}`);
    return { ok: false, res: NextResponse.json({ error: "Your account does not hold the role required for this action." }, { status: 403 }) };
  }
  return { ok: true, user };
}

// ---------- login throttling (in-memory, per process) ----------
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW_MS = 15 * 60_000, MAX_FAILS = 5, MAX_FAILS_PER_IP = 30; // per-IP limit is looser: offices share one address
export function throttled(key: string): boolean {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) { attempts.delete(key); return false; }
  return a.n >= (key.startsWith("i:") ? MAX_FAILS_PER_IP : MAX_FAILS);
}
export function recordFail(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(key, { n: 1, first: Date.now() });
  else a.n++;
}
export function clearFails(key: string) { attempts.delete(key); }
