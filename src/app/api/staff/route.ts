import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { guard, hashPassword, passwordProblem, parseRoles, ALL_ROLES } from "@/lib/auth";

const PUBLIC = { id: true, email: true, name: true, roles: true, active: true, notes: true, mustChangePassword: true, createdAt: true, updatedAt: true } as const;
// passwordHash is never selected or returned.

// GET /api/staff — Admin only
export async function GET(req: NextRequest) {
  const g = await guard(req, ["Admin"]);
  if (!g.ok) return g.res;
  const staff = await db.staffRole.findMany({ orderBy: { name: "asc" }, select: { ...PUBLIC, passwordHash: false } as never });
  return NextResponse.json(staff);
}

// POST /api/staff — create/update a staff member (Admin only). Optional `password` sets a TEMPORARY password
// (the user must change it at next sign-in).
export async function POST(req: NextRequest) {
  const g = await guard(req, ["Admin"]);
  if (!g.ok) return g.res;
  try {
    const b = await req.json();
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const name = typeof b.name === "string" ? b.name.trim() : "";
    const roles = parseRoles(Array.isArray(b.roles) ? b.roles.join(",") : String(b.roles ?? ""));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || !roles.length)
      return NextResponse.json({ error: "Valid email, name and at least one valid role (" + ALL_ROLES.join(", ") + ") are required." }, { status: 400 });
    const active = b.active === undefined ? true : !!b.active;
    const notes = typeof b.notes === "string" ? b.notes.slice(0, 500) : "";
    if (email === g.user.email && (!active || !roles.includes("Admin")))
      return NextResponse.json({ error: "You cannot suspend yourself or remove your own Admin role." }, { status: 400 });

    const data: Record<string, unknown> = { name, roles: roles.join(","), active, notes };
    if (b.password !== undefined && b.password !== "") {
      const problem = passwordProblem(b.password);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      data.passwordHash = hashPassword(b.password);
      data.mustChangePassword = true;
    }
    const row = await db.staffRole.upsert({ where: { email }, update: data as never, create: { email, ...data } as never, select: PUBLIC as never });
    await audit(req, g.user.email, "staff.save", email, `roles=${roles.join(",")}; active=${active}${data.passwordHash ? "; password reset" : ""}`);
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Failed to save staff" }, { status: 500 });
  }
}

// DELETE /api/staff?email=... — Admin only; cannot delete yourself.
export async function DELETE(req: NextRequest) {
  const g = await guard(req, ["Admin"]);
  if (!g.ok) return g.res;
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (email === g.user.email) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  try { await db.staffRole.delete({ where: { email } }); await audit(req, g.user.email, "staff.delete", email); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 }); }
}
