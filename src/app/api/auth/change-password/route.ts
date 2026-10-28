import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { guard, hashPassword, verifyPassword, passwordProblem } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const g = await guard(req, [], { allowPendingPasswordChange: true });
  if (!g.ok) return g.res;
  let body: { currentPassword?: unknown; newPassword?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const row = await db.staffRole.findUnique({ where: { email: g.user.email } });
  if (!row || typeof body.currentPassword !== "string" || !verifyPassword(body.currentPassword, row.passwordHash))
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  const problem = passwordProblem(body.newPassword);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (body.newPassword === body.currentPassword) return NextResponse.json({ error: "Choose a different password." }, { status: 400 });
  await db.staffRole.update({ where: { email: row.email }, data: { passwordHash: hashPassword(body.newPassword as string), mustChangePassword: false } });
  await audit(req, g.user.email, "auth.password_changed");
  return NextResponse.json({ ok: true });
}
