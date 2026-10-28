import {
  calculateRiskScore, getReferralPathway, getSpecialEquipment, calculateRecommendedTier,
  calculateTotalManpower, calculateUnitDeploymentManpower, calculateDurations,
} from "@/lib/emas-risk";
import { getTierRank, TIERS, DISTRICTS, EVENT_TYPES, ENVIRONMENTS } from "@/lib/emas-constants";
import { pickModelData, n0 } from "@/lib/sanitize";

const DENY = ["id", "submissionDate", "submittedBy", "createdAt", "updatedAt"];

export type EventBuild = { ok: true; data: Record<string, string | number | boolean> } | { ok: false; error: string };

/**
 * Server-authoritative event record: every derived field (risk score, recommended tier, hospitals,
 * compliance, manpower totals, deployment totals, durations, variances) is recomputed here and
 * overrides whatever the client sent. Enforces the tier hard control (Framework 5.5).
 */
export function buildEventData(body: unknown, existing?: Record<string, unknown>): EventBuild {
  const d = pickModelData("EventRecord", body, DENY) as Record<string, any>;
  const merged: Record<string, any> = { ...(existing ?? {}), ...d };
  const need = (k: string) => typeof merged[k] === "string" && merged[k].trim() !== "";
  for (const k of ["eventName", "district", "eventType", "environment", "venue", "crowdType", "dateOfCover", "selectedTier"])
    if (!need(k)) return { ok: false, error: `${k} is required.` };
  if (!DISTRICTS.some(x => x.name === merged.district)) return { ok: false, error: "Unknown district." };
  if (!EVENT_TYPES.some(x => x.type === merged.eventType)) return { ok: false, error: "Unknown event type." };
  if (!ENVIRONMENTS.some(x => x.env === merged.environment)) return { ok: false, error: "Unknown environment." };
  if (!TIERS.some(x => x.name === merged.selectedTier)) return { ok: false, error: "Unknown level of service." };

  const recommended = calculateRecommendedTier(merged.eventType, merged.environment);
  if (getTierRank(merged.selectedTier) < getTierRank(recommended))
    return { ok: false, error: `Tier compliance: "${merged.selectedTier}" is below the minimum required for this event (${recommended}).` };

  const ref = getReferralPathway(merged.district);
  d.nearestHospital = ref.primary; d.backupHospital = ref.backup;
  d.calculatedRiskScore = calculateRiskScore(merged.eventType, merged.environment);
  d.specialEquipment = getSpecialEquipment(merged.environment);
  d.recommendedTier = recommended; d.complianceCheck = "Compliant";

  const g = (k: string) => n0(merged[k]);
  const planned = calculateTotalManpower(g("doctorsPlanned"), g("paramedicsPlanned"), g("nursesPlanned"), g("driversPlanned"), g("ssNgoPlanned"), g("ssMindefPlanned"));
  d.totalManpowerPlanned = planned;
  const units = calculateUnitDeploymentManpower({
    walkingTeamCount: g("walkingTeamCount"), walkingTeamManpower: g("walkingTeamManpower"),
    clinicPublicCount: g("clinicPublicCount"), clinicPublicManpower: g("clinicPublicManpower"),
    clinicVvipCount: g("clinicVvipCount"), clinicVvipManpower: g("clinicVvipManpower"),
    ambulanceTeamCount: g("ambulanceTeamCount"), ambulanceTeamManpower: g("ambulanceTeamManpower"),
    victorTeamCount: g("victorTeamCount"), victorTeamManpower: g("victorTeamManpower"),
    supportVehicleCount: g("supportVehicleCount"), supportVehicleManpower: g("supportVehicleManpower"),
  } as any) as any;
  const overall = typeof units === "number" ? units : Number(units?.overall ?? units?.total ?? 0);
  d.manpowerOverall = overall; d.manpowerVariance = overall - planned;
  const actual = g("doctorsActual") + g("paramedicsActual") + g("nursesActual") + g("driversActual") + g("ssNgoActual") + g("ssMindefActual");
  d.staffingVariance = actual - planned;
  const dur = calculateDurations(String(merged.clockInTime ?? ""), String(merged.eventStartTime ?? ""), String(merged.standdownTime ?? ""), String(merged.finalClockOutTime ?? ""));
  d.missionDuration = dur.missionDuration; d.activeDutyDuration = dur.activeDutyDuration;
  return { ok: true, data: d };
}
