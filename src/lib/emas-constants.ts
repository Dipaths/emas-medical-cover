// EMAS Medical Cover System - Constants & Configuration
// Based on the Operations Framework v1.1

// ===== DISTRICTS & REFERRAL PATHWAYS =====
export const DISTRICTS = [
  { name: "Brunei-Muara", primaryHospital: "RIPAS Hospital", backupHospital: "JPMC" },
  { name: "Tutong", primaryHospital: "PMMPMHAMB Hospital", backupHospital: "—" },
  { name: "Belait", primaryHospital: "Suri Seri Begawan Hospital", backupHospital: "Panaga Health Centre" },
  { name: "Temburong", primaryHospital: "PIHM Hospital", backupHospital: "Escalate to RIPAS (Sea/Air)" },
] as const;

// ===== EVENT TYPES =====
export const EVENT_TYPES = [
  { type: "STATE/VVIP", baseRisk: 3.0, baselineTier: "VVIP/SCT" },
  { type: "SPORT", baseRisk: 2.5, baselineTier: "Level 3 (Sport - General)" },
  { type: "ESCORT", baseRisk: 1.5, baselineTier: "VIP/ALS" },
  { type: "CORPORATE", baseRisk: 1.0, baselineTier: "Public/BLS" },
] as const;

// ===== ENVIRONMENTS =====
export const ENVIRONMENTS = [
  { env: "Jungle/Terrain", multiplier: 1.5, specialEquipment: "4x4 Ambulance Required" },
  { env: "Open Water", multiplier: 1.3, specialEquipment: "Water Rescue Team" },
  { env: "Open Road", multiplier: 1.3, specialEquipment: "—" },
  { env: "Outdoor Crowded", multiplier: 1.2, specialEquipment: "—" },
  { env: "Outdoor Shaded", multiplier: 1.1, specialEquipment: "Hydration Load" },
  { env: "Indoor Aerated/Ventilated", multiplier: 1.0, specialEquipment: "—" },
] as const;

// ===== LEVELS OF SERVICE (sorted by rank, 1=lowest, 4=highest) =====
export const TIERS = [
  { name: "Public/BLS", rank: 1 },
  { name: "Level 3 (Sport - General)", rank: 1 },
  { name: "Level 2 (Sport - Specialized)", rank: 2 },
  { name: "Level 1 (Sport - Critical)", rank: 3 },
  { name: "VIP/ALS", rank: 3 },
  { name: "VVIP/SCT", rank: 4 },
] as const;

// ===== VENUES =====
export const VENUES = [
  "Istana Nurul Iman",
  "Padang SOAS",
  "Indoor Stadium",
  "ICC Berakas",
  "Outdoor Field / Open Venue",
  "Other (specify in Notes)",
] as const;

// ===== CROWD TYPES =====
export const CROWD_TYPES = [
  "Open to public",
  "Invitation only",
  "Mass spectator/audience",
] as const;

// ===== CREW COMPOSITIONS =====
export const CREW_COMPOSITIONS = [
  { unitType: "VVIP/SCT Unit", doctors: 1, paramedics: 1, nurses: 1, drivers: 0 },
  { unitType: "ALS Mobile Team", doctors: 0, paramedics: 1, nurses: 2, drivers: 0 },
  { unitType: "BLS Transport Team", doctors: 0, paramedics: 0, nurses: 2, drivers: 1 },
] as const;

// ===== TRIAGE PRIORITIES =====
export const TRIAGE_PRIORITIES = [
  { code: "P1", label: "Emergent", color: "red", description: "Immediate threat to life or limb" },
  { code: "P2", label: "Urgent", color: "yellow", description: "Significant but not immediately life-threatening" },
  { code: "P3", label: "Non-Urgent", color: "green", description: "Minor, stable presentation" },
] as const;

// ===== FINAL OUTCOMES =====
export const FINAL_OUTCOMES = [
  "Treated & Released",
  "Transferred for Further Treatment",
  "Admitted (Observation)",
  "Against Medical Advice (AMA)",
  "Deceased",
  "Pending",
] as const;

// ===== GENDER OPTIONS =====
export const GENDERS = ["Male", "Female", "Other"] as const;

// ===== MENTAL STATUS =====
export const MENTAL_STATUSES = ["Alert", "Verbal", "Pain", "Unresponsive", "Confused"] as const;

// ===== UNIT DEPLOYMENT DEFAULTS (v1.2) =====
export const UNIT_DEPLOYMENT_DEFAULTS = [
  { key: "walkingTeam", label: "Walking Team", defaultManpower: 2 },
  { key: "clinicPublic", label: "Clinic (Public)", defaultManpower: 3 },
  { key: "clinicVvip", label: "Clinic (VVIP)", defaultManpower: 4 },
  { key: "ambulanceTeam", label: "Ambulance Team (Public)", defaultManpower: 3 },
  { key: "victorTeam", label: "Victor Team (VVIP Ambulance)", defaultManpower: 3 },
  { key: "supportVehicle", label: "Support Vehicle (MRS/NGO)", defaultManpower: 2 },
] as const;

// ===== ROLES =====
export const ROLES = ["Triage", "EventPlanning", "Dashboard", "Admin"] as const;
export type Role = (typeof ROLES)[number];

// ===== HELPER: Get tier rank =====
export function getTierRank(tierName: string): number {
  const tier = TIERS.find(t => t.name === tierName);
  return tier ? tier.rank : 0;
}

// ===== HELPER: Get district info =====
export function getDistrictInfo(districtName: string) {
  return DISTRICTS.find(d => d.name === districtName);
}

// ===== HELPER: Get event type info =====
export function getEventTypeInfo(eventType: string) {
  return EVENT_TYPES.find(e => e.type === eventType);
}

// ===== HELPER: Get environment info =====
export function getEnvironmentInfo(envName: string) {
  return ENVIRONMENTS.find(e => e.env === envName);
}
