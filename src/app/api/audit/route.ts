import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "@/lib/auth";

// GET /api/audit?limit=200&action=staff — Admin only. Read-only: the API offers no way to edit or delete entries.
export async function GET(req: NextRequest) {
  const g = await guard(req, ["Admin"]);
  if (!g.ok) return g.res;
  const p = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "200", 10) || 200, 1), 500);
  const action = (p.get("action") ?? "").trim();
  const rows = await db.auditLog.findMany({
    where: action ? { action: { startsWith: action } } : undefined,
    orderBy: { at: "desc" },
    take: limit,
  });
  return NextResponse.json(rows);
}
