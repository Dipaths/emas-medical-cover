// EMAS Risk Calculation Engine
// Implements the multiplicative risk model from Framework Section 5

import {
  getEventTypeInfo,
  getEnvironmentInfo,
  getDistrictInfo,
  getTierRank,
  TIERS,
} from "./emas-constants";

/**
 * Calculate risk score: Base Risk × Environmental Multiplier
 * Framework Section 5.3 — multiplicative, not additive
 */
export function calculateRiskScore(eventType: string, environment: string): number {
  const evt = getEventTypeInfo(eventType);
  const env = getEnvironmentInfo(environment);
  if (!evt || !env) return 0;
  return Math.round(evt.baseRisk * env.multiplier * 100) / 100;
}

/**
 * Get hospital referral info for a district
 */
export function getReferralPathway(district: string) {
  const info = getDistrictInfo(district);
  return {
    primary: info?.primaryHospital ?? "Select District",
    backup: info?.backupHospital ?? "—",
  };
}

/**
 * Get special equipment/requirement for an environment
 */
export function getSpecialEquipment(environment: string): string {
  const env = getEnvironmentInfo(environment);
  return env?.specialEquipment ?? "—";
}

/**
 * Calculate recommended minimum tier
 * Framework Section 5.4 — tier escalation rule
 */
export function calculateRecommendedTier(eventType: string, environment: string): string {
  const evt = getEventTypeInfo(eventType);
  const env = getEnvironmentInfo(environment);
  if (!evt || !env) return "Public/BLS";

  let recommendedTier = evt.baselineTier;

  // Escalation rule: if multiplier >= 1.3 and baseline tier rank < 3
  if (env.multiplier >= 1.3 && getTierRank(evt.baselineTier) < 3) {
    if (evt.type === "SPORT") {
      recommendedTier = "Level 1 (Sport - Critical)";
    } else {
      recommendedTier = "VIP/ALS";
    }
  }

  return recommendedTier;
}

/**
 * Get allowed tiers for the dropdown (only tiers at or above recommended minimum)
 * Framework Section 5.5 — hard control (v1.1)
 */
export function getAllowedTiers(recommendedTier: string): string[] {
  const minRank = getTierRank(recommendedTier);
  return TIERS.filter(t => t.rank >= minRank).map(t => t.name);
}

/**
 * Check compliance: is the selected tier at or above the recommended minimum?
 */
export function checkCompliance(selectedTier: string, recommendedTier: string): {
  compliant: boolean;
  message: string;
  severity: "ok" | "warn" | "danger";
} {
  if (!selectedTier) {
    return { compliant: false, message: "Select a Level of Service", severity: "warn" };
  }

  const selectedRank = getTierRank(selectedTier);
  const recommendedRank = getTierRank(recommendedTier);

  if (selectedRank >= recommendedRank) {
    return { compliant: true, message: "Compliant", severity: "ok" };
  }

  return {
    compliant: false,
    message: `Below minimum — upgrade to ${recommendedTier} required`,
    severity: "danger",
  };
}

/**
 * Calculate transport/mobile team count
 * Framework Section 6.2
 * Teams = IF(mobile-assigned = 0, 1, CEILING(mobile-assigned / 3, 1) + 1)
 */
export function calculateTransportTeams(mobileManpower: number): number {
  if (mobileManpower === 0) return 1;
  return Math.ceil(mobileManpower / 3) + 1;
}

/**
 * Calculate total manpower
 */
export function calculateTotalManpower(
  doctors: number,
  paramedics: number,
  nurses: number,
  drivers: number,
  ssNgo: number,
  ssMindef: number
): number {
  return doctors + paramedics + nurses + drivers + ssNgo + ssMindef;
}

/**
 * Calculate unit deployment manpower (v1.2)
 */
export function calculateUnitDeploymentManpower(units: {
  walkingTeamCount: number; walkingTeamManpower: number;
  clinicPublicCount: number; clinicPublicManpower: number;
  clinicVvipCount: number; clinicVvipManpower: number;
  ambulanceTeamCount: number; ambulanceTeamManpower: number;
  victorTeamCount: number; victorTeamManpower: number;
  supportVehicleCount: number; supportVehicleManpower: number;
}): number {
  return (
    units.walkingTeamCount * units.walkingTeamManpower +
    units.clinicPublicCount * units.clinicPublicManpower +
    units.clinicVvipCount * units.clinicVvipManpower +
    units.ambulanceTeamCount * units.ambulanceTeamManpower +
    units.victorTeamCount * units.victorTeamManpower +
    units.supportVehicleCount * units.supportVehicleManpower
  );
}

/**
 * Calculate total clinics
 */
export function calculateTotalClinics(clinicPublic: number, clinicVvip: number): number {
  return clinicPublic + clinicVvip;
}

/**
 * Parse time string (HH:MM) to minutes
 */
export function parseTimeToMinutes(time: string): number | null {
  if (!time || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Format minutes to H:MM duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/**
 * Calculate mission duration and active duty duration
 */
export function calculateDurations(
  clockIn: string,
  eventStart: string,
  standdown: string,
  clockOut: string
): { missionDuration: string; activeDutyDuration: string } {
  const clockInMin = parseTimeToMinutes(clockIn);
  const clockOutMin = parseTimeToMinutes(clockOut);
  const eventStartMin = parseTimeToMinutes(eventStart);
  const standdownMin = parseTimeToMinutes(standdown);

  let missionDuration = "0:00";
  let activeDutyDuration = "0:00";

  if (clockInMin !== null && clockOutMin !== null) {
    missionDuration = formatDuration(clockOutMin >= clockInMin ? clockOutMin - clockInMin : 1440 - clockInMin + clockOutMin);
  }

  if (eventStartMin !== null && standdownMin !== null) {
    activeDutyDuration = formatDuration(standdownMin >= eventStartMin ? standdownMin - eventStartMin : 1440 - eventStartMin + standdownMin);
  }

  return { missionDuration, activeDutyDuration };
}

/**
 * Calculate staffing variance
 */
export function calculateStaffingVariance(planned: number, actual: number): number {
  return actual - planned;
}
