import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "@/lib/auth";
import { buildEventData } from "@/lib/event-derive";
import { audit } from "@/lib/audit";

// GET /api/events — EventPlanning/Admin: full records. Triage: minimal list (to pick the event for a patient record).
export async function GET(req: NextRequest) {
  const g = await guard(req, ["EventPlanning", "Triage"]);
  if (!g.ok) return g.res;
  try {
    const roles = g.user.roles;
    const full = roles.includes("Admin") || roles.includes("EventPlanning");
    if (!full) {
      const rows = await db.eventRecord.findMany({
        orderBy: { submissionDate: "desc" },
        select: { id: true, eventName: true, dateOfCover: true, venue: true, district: true },
      });
      return NextResponse.json(rows);
    }
    const params = req.nextUrl.searchParams;
    const district = params.get("district"), eventType = params.get("eventType");
    const dateFrom = params.get("dateFrom"), dateTo = params.get("dateTo");
    const where: Record<string, unknown> = {};
    if (district && district !== "All") where.district = district;
    if (eventType && eventType !== "All") where.eventType = eventType;
    if (dateFrom || dateTo) {
      const f: Record<string, string> = {};
      if (dateFrom) f.gte = dateFrom;
      if (dateTo) f.lte = dateTo;
      where.dateOfCover = f;
    }
    // Counts only — never patient detail — are exposed to Event Planning.
    const events = await db.eventRecord.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { submissionDate: "desc" },
      include: { _count: { select: { triageRecords: true } } },
    });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/events — create (EventPlanning/Admin). Derived fields and the tier hard control are enforced here.
export async function POST(req: NextRequest) {
  const g = await guard(req, ["EventPlanning"]);
  if (!g.ok) return g.res;
  try {
    const built = buildEventData(await req.json());
    if (!built.ok) {
      if (built.error.startsWith("Tier compliance")) await audit(req, g.user.email, "event.rejected_tier", "", built.error);
      return NextResponse.json({ error: built.error }, { status: 400 });
    }
    const event = await db.eventRecord.create({ data: { ...built.data, submittedBy: g.user.email } as never });
    await audit(req, g.user.email, "event.create", event.id, String(built.data.eventName));
    return NextResponse.json(event);
  } catch (e) {
    console.error("Event create error:", e);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

// PUT /api/events — update (EventPlanning/Admin); same server-side rules as create.
export async function PUT(req: NextRequest) {
  const g = await guard(req, ["EventPlanning"]);
  if (!g.ok) return g.res;
  try {
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const current = await db.eventRecord.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const built = buildEventData(body, current as unknown as Record<string, unknown>);
    if (!built.ok) {
      if (built.error.startsWith("Tier compliance")) await audit(req, g.user.email, "event.rejected_tier", id, built.error);
      return NextResponse.json({ error: built.error }, { status: 400 });
    }
    const event = await db.eventRecord.update({ where: { id }, data: built.data as never });
    await audit(req, g.user.email, "event.update", id, String(built.data.eventName ?? ""));
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}
