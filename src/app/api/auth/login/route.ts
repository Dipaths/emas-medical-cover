import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyPassword, signSession, sessionCookie, throttled, recordFail, clearFails, parseRoles } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { if (!origin || new URL(origin).host !== host) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 }); }
  catch { return NextResponse.json({ error: "Bad origin." }, { status: 403 }); }

  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const keys = [`e:${email}`, `i:${ip}`];
  if (keys.some(throttled)) return NextResponse.json({ error: "Too many failed attempts. Try again in 15 minutes." }, { status: 429 });

  const row = await db.staffRole.findUnique({ where: { email } });
  const ok = verifyPassword(password, row?.passwordHash ?? "") && !!row && row.active;
  if (!ok || !row) {
    keys.forEach(recordFail);
    await audit(req, email, "auth.login_failed");
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  keys.forEach(clearFails);
  await audit(req, row.email, "auth.login");
  const res = NextResponse.json({ email: row.email, name: row.name, roles: parseRoles(row.roles), mustChangePassword: row.mustChangePassword });
  res.cookies.set(sessionCookie(signSession(row.email)));
  return res;
}
