import { db } from "@/lib/db";

// NOTE: seeded staff have NO password and cannot sign in. Create real accounts with scripts/create-admin.ts.
async function seed() {
  console.log("Seeding EMAS database...");

  const staffData = [
    { email: "admin@emas.gov.bn", name: "System Admin", roles: "Admin", active: true, notes: "System administrator" },
    { email: "triage@emas.gov.bn", name: "Triage User", roles: "Triage", active: true, notes: "Clinical responder" },
    { email: "planner@emas.gov.bn", name: "Event Planner", roles: "EventPlanning", active: true, notes: "Operations officer" },
    { email: "commander@emas.gov.bn", name: "Duty Commander", roles: "Dashboard", active: true, notes: "Command oversight" },
    { email: "super@emas.gov.bn", name: "Supervisor X", roles: "Triage,Dashboard", active: true, notes: "Dual role" },
  ];

  for (const s of staffData) {
    await db.staffRole.upsert({
      where: { email: s.email },
      update: s,
      create: s,
    });
  }

  const existingEvents = await db.eventRecord.count();
  if (existingEvents === 0) {
    const event1 = await db.eventRecord.create({
      data: {
        submittedBy: "planner@emas.gov.bn",
        eventName: "National Day Parade",
        district: "Brunei-Muara",
        eventType: "STATE/VVIP",
        environment: "Outdoor Crowded",
        venue: "Padang SOAS",
        crowdType: "Open to public",
        expectedAttendance: 5000,
        dateOfCover: "2026-02-23",
        nearestHospital: "RIPAS Hospital",
        backupHospital: "JPMC",
        calculatedRiskScore: 3.6,
        specialEquipment: "—",
        recommendedTier: "VVIP/SCT",
        selectedTier: "VVIP/SCT",
        complianceCheck: "Compliant",
        doctorsPlanned: 2, paramedicsPlanned: 4, nursesPlanned: 12, driversPlanned: 3, ssNgoPlanned: 4, ssMindefPlanned: 2,
        totalManpowerPlanned: 27,
        walkingTeamCount: 2, walkingTeamManpower: 2,
        clinicPublicCount: 2, clinicPublicManpower: 3,
        clinicVvipCount: 1, clinicVvipManpower: 4,
        ambulanceTeamCount: 3, ambulanceTeamManpower: 3,
        victorTeamCount: 1, victorTeamManpower: 3,
        supportVehicleCount: 2, supportVehicleManpower: 2,
        manpowerOverall: 25, manpowerVariance: -2,
        clockInTime: "06:00", eventStartTime: "08:00", standdownTime: "12:00", finalClockOutTime: "13:00",
        missionDuration: "7:00", activeDutyDuration: "4:00",
        doctorsActual: 2, paramedicsActual: 4, nursesActual: 12, driversActual: 3, ssNgoActual: 4, ssMindefActual: 2,
        staffingVariance: 0, totalPatientsAttended: 2, hospitalTransportCases: 1,
        operationalNotes: "Smooth cover, no incidents beyond two minor heat cases.",
      },
    });

    const event2 = await db.eventRecord.create({
      data: {
        submittedBy: "planner@emas.gov.bn",
        eventName: "Charity Fun Run (Tutong)",
        district: "Tutong",
        eventType: "SPORT",
        environment: "Open Road",
        venue: "Outdoor Field / Open Venue",
        crowdType: "Mass spectator/audience",
        expectedAttendance: 1200,
        dateOfCover: "2026-02-23",
        nearestHospital: "PMMPMHAMB Hospital",
        backupHospital: "—",
        calculatedRiskScore: 3.25,
        specialEquipment: "—",
        recommendedTier: "Level 1 (Sport - Critical)",
        selectedTier: "Level 1 (Sport - Critical)",
        complianceCheck: "Compliant",
        doctorsPlanned: 0, paramedicsPlanned: 2, nursesPlanned: 6, driversPlanned: 1, ssNgoPlanned: 2, ssMindefPlanned: 0,
        totalManpowerPlanned: 11,
        walkingTeamCount: 1, walkingTeamManpower: 2,
        clinicPublicCount: 1, clinicPublicManpower: 3,
        clinicVvipCount: 0, clinicVvipManpower: 4,
        ambulanceTeamCount: 1, ambulanceTeamManpower: 3,
        victorTeamCount: 0, victorTeamManpower: 3,
        supportVehicleCount: 1, supportVehicleManpower: 2,
        manpowerOverall: 10, manpowerVariance: -1,
        clockInTime: "06:30", eventStartTime: "07:00", standdownTime: "10:00", finalClockOutTime: "10:45",
        missionDuration: "4:15", activeDutyDuration: "3:00",
        doctorsActual: 0, paramedicsActual: 2, nursesActual: 6, driversActual: 1, ssNgoActual: 2, ssMindefActual: 0,
        staffingVariance: 0, totalPatientsAttended: 1, hospitalTransportCases: 0,
        operationalNotes: "Two ankle sprains treated on course, no transport required.",
      },
    });

    await db.triageRecord.createMany({
      data: [
        {
          eventId: event1.id, submittedBy: "triage@emas.gov.bn",
          eventDescription: "National Day Parade", venueType: "Outdoor Crowded",
          caseIndex: "230226/C1/PT1", triageTime: "09:15", providerRole: "Nurse", assignmentLocation: "Clinic 1",
          patientName: "JOHN DOE", age: 45, gender: "Male", affiliation: "Public",
          mentalStatus: "Alert", triagePriority: "P2", presentingComplaint: "Heat exhaustion", painScale: 4,
          temperature: "38.5", bloodPressure: "110/70", pulse: "95", spo2: "97", oxygenSupport: "None",
          actionsTaken: "Rest, oral rehydration, cooling", treatmentResponse: "Improved",
          finalOutcome: "Treated & Released", hospitalTransport: false,
        },
        {
          eventId: event1.id, submittedBy: "triage@emas.gov.bn",
          eventDescription: "National Day Parade", venueType: "Outdoor Crowded",
          caseIndex: "230226/C1/PT2", triageTime: "10:42", providerRole: "Paramedic", assignmentLocation: "Mobile Team 1",
          patientName: "AHMAD BIN ALI", age: 62, gender: "Male", affiliation: "Public",
          mentalStatus: "Alert", triagePriority: "P1", presentingComplaint: "Chest pain", painScale: 8,
          temperature: "36.8", bloodPressure: "150/95", pulse: "110", spo2: "93", oxygenSupport: "O2 15L NRB",
          ecgTraumaFindings: "ST elevation noted",
          actionsTaken: "Aspirin, GTN, O2, 12-lead ECG, transport pre-alert", treatmentResponse: "Stabilised for transport",
          finalOutcome: "Transferred for Further Treatment", hospitalTransport: true, transferHospital: "RIPAS Hospital",
        },
        {
          eventId: event2.id, submittedBy: "triage@emas.gov.bn",
          eventDescription: "Charity Fun Run (Tutong)", venueType: "Open Road",
          caseIndex: "230226/C2/PT1", triageTime: "09:50", providerRole: "Nurse", assignmentLocation: "Course Medical Point",
          patientName: "SITI BTE HASSAN", age: 28, gender: "Female", affiliation: "Runner",
          mentalStatus: "Alert", triagePriority: "P3", presentingComplaint: "Ankle sprain", painScale: 5,
          temperature: "37.0", bloodPressure: "120/80", pulse: "78", spo2: "99", oxygenSupport: "None",
          actionsTaken: "Strapping, RICE advice, analgesia", treatmentResponse: "Improved",
          finalOutcome: "Treated & Released", hospitalTransport: false,
        },
      ],
    });
  }

  console.log("Seeding complete!");
}

seed().catch(console.error).finally(() => db.$disconnect());
