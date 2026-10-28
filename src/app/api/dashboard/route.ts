import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dashboard — aggregate stats for the command dashboard
export async function GET(req: NextRequest) {
  const g = await guard(req, ["Dashboard"]);
  if (!g.ok) return g.res;
  try {
    const [totalEvents, totalTriage, events, triageRecords] = await Promise.all([
      db.eventRecord.count(),
      db.triageRecord.count(),
      db.eventRecord.findMany({
        orderBy: { submissionDate: "desc" },
        include: { _count: { select: { triageRecords: true } } },
      }),
      // Only non-identifying columns are ever read: no names, contact details, case index or clinical free text.
      db.triageRecord.findMany({
        orderBy: { timestamp: "desc" },
        select: { id: true, eventId: true, timestamp: true, triagePriority: true, age: true, gender: true, mentalStatus: true, finalOutcome: true, hospitalTransport: true, painScale: true },
      }),
    ]);

    // Compliance stats
    const compliantEvents = events.filter(e => e.complianceCheck === "Compliant").length;
    const nonCompliantEvents = events.filter(e => e.complianceCheck && e.complianceCheck !== "Compliant" && e.complianceCheck !== "Select a Level of Service").length;

    // Triage breakdown
    const p1Count = triageRecords.filter(t => t.triagePriority === "P1").length;
    const p2Count = triageRecords.filter(t => t.triagePriority === "P2").length;
    const p3Count = triageRecords.filter(t => t.triagePriority === "P3").length;

    // Hospital transport count
    const hospitalTransports = triageRecords.filter(t => t.hospitalTransport).length;

    // Clinic prevalence (v1.2)
    const totalClinics = events.reduce((sum, e) => sum + e.clinicPublicCount + e.clinicVvipCount, 0);
    const vvipClinics = events.reduce((sum, e) => sum + e.clinicVvipCount, 0);

    // AMA rate
    const amaCount = triageRecords.filter(t => /^(AMA|Against Medical Advice)/i.test(t.finalOutcome)).length;

    // Staffing variance summary
    const negativeVarianceEvents = events.filter(e => e.staffingVariance < 0).length;

    return NextResponse.json({
      totalEvents,
      totalTriage,
      compliantEvents,
      nonCompliantEvents,
      complianceRate: totalEvents > 0 ? Math.round((compliantEvents / totalEvents) * 100) : 0,
      p1Count,
      p2Count,
      p3Count,
      hospitalTransports,
      totalClinics,
      vvipClinics,
      vvipClinicShare: totalClinics > 0 ? Math.round((vvipClinics / totalClinics) * 100) : 0,
      amaCount,
      amaRate: totalTriage > 0 ? Math.round((amaCount / totalTriage) * 100) : 0,
      negativeVarianceEvents,
      events: events.map(({ submittedBy: _s, operationalNotes: _n, ...rest }) => rest),
      recentTriage: triageRecords.slice(0, 20),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
