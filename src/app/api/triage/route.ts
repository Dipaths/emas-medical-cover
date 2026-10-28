import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "@/lib/auth";
import { pickModelData } from "@/lib/sanitize";
import { audit } from "@/lib/audit";

// GET /api/triage — patient-identifiable: Triage/Admin only.
export async function GET(req: NextRequest) {
  const g = await guard(req, ["Triage"]);
  if (!g.ok) return g.res;
  try {
    const eventId = req.nextUrl.searchParams.get("eventId");
    const records = await db.triageRecord.findMany({
      where: eventId ? { eventId } : {},
      orderBy: { timestamp: "desc" },
    });
    await audit(req, g.user.email, "triage.view", eventId ?? "all", `${records.length} record(s)`);
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Failed to fetch triage records" }, { status: 500 });
  }
}

// POST /api/triage — create a triage record (Triage/Admin). Submitter is taken from the session.
export async function POST(req: NextRequest) {
  const g = await guard(req, ["Triage"]);
  if (!g.ok) return g.res;
  try {
    const body = await req.json();
    const data = pickModelData("TriageRecord", body, ["id", "timestamp", "submittedBy", "createdAt", "updatedAt", "eventId"]);
    const eventId = typeof body?.eventId === "string" ? body.eventId : "";
    if (!eventId) return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    const event = await db.eventRecord.findUnique({ where: { id: eventId }, select: { id: true, eventName: true } });
    if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 400 });

    const errors: string[] = [];
    if (!String(data.patientName ?? "")) errors.push("Patient name is required.");
    if (!["P1", "P2", "P3"].includes(String(data.triagePriority ?? ""))) errors.push("Triage priority must be P1, P2 or P3.");
    const ci = String(data.caseIndex ?? "");
    if (ci && !/^\d{6}\/C\d+\/PT\d+$/i.test(ci)) errors.push("Case index must follow ddmmyy/C#/PT#.");
    if (!String(data.finalOutcome ?? "")) errors.push("Final outcome is required.");
    if (ci) {
      const dup = await db.triageRecord.findFirst({ where: { eventId, caseIndex: ci.toUpperCase() }, select: { id: true } });
      if (dup) errors.push(`Case index ${ci.toUpperCase()} already exists for this event.`);
    }
    if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    if (ci) data.caseIndex = ci.toUpperCase();
    data.patientName = String(data.patientName).toUpperCase();
    data.eventDescription = event.eventName;
    const record = await db.triageRecord.create({ data: { ...data, eventId, submittedBy: g.user.email } as never });
    await audit(req, g.user.email, "triage.create", record.id, `event=${event.eventName}; case=${data.caseIndex ?? ""}`);
    return NextResponse.json(record);
  } catch (e) {
    console.error("Triage create error:", e);
    return NextResponse.json({ error: "Failed to create triage record" }, { status: 500 });
  }
}
