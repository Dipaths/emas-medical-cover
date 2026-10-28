import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { if (!origin || new URL(origin).host !== host) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 }); } catch { return NextResponse.json({ error: "Bad origin." }, { status: 403 }); }
  const u = await getSessionUser(req);
  if (u) await audit(req, u.email, "auth.logout");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie("", true));
  return res;
}
