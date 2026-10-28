import assert from "node:assert/strict";
process.env.AUTH_SECRET = "x".repeat(48);
const { NextRequest } = require("next/server");
const { db } = require("@/lib/db");
const A = require("@/lib/auth");
import * as login from "../src/app/api/auth/login/route";
import * as me from "../src/app/api/auth/me/route";
import * as chpw from "../src/app/api/auth/change-password/route";
import * as events from "../src/app/api/events/route";
import * as triage from "../src/app/api/triage/route";
import * as dash from "../src/app/api/dashboard/route";
import * as staff from "../src/app/api/staff/route";
import * as auditRoute from "../src/app/api/audit/route";

const ORIGIN = "http://app.test";
let ipn = 0;
const req = (method: string, url: string, o: { cookie?: string; body?: any; origin?: string | null } = {}) =>
  new NextRequest({ method, url: ORIGIN + url, body: o.body,
    headers: { host: "app.test", "x-forwarded-for": "10.0.0." + (++ipn), ...(o.origin === null ? {} : { origin: o.origin ?? ORIGIN }) },
    cookies: o.cookie ? { emas_session: o.cookie } : {} });
const pw = "Passw0rd-long1";
async function seed(email: string, roles: string, extra: any = {}) {
  await db.staffRole.upsert({ where: { email }, update: {}, create: { email, name: email.split("@")[0], roles, active: true, passwordHash: A.hashPassword(pw), mustChangePassword: false, ...extra } });
}
async function signIn(email: string, password = pw) {
  const r = await login.POST(req("POST", "/api/auth/login", { body: { email, password } }));
  return { r, cookie: r.cookieJar[0]?.value as string };
}
const status = async (p: Promise<any>) => (await p).status;

(async () => {
  await seed("admin@x.bn", "Admin"); await seed("tri@x.bn", "Triage"); await seed("ev@x.bn", "EventPlanning");
  await seed("cmd@x.bn", "Dashboard"); await seed("temp@x.bn", "Triage", { mustChangePassword: true }); await seed("gone@x.bn", "Triage");
  await db.staffRole.upsert({ where: { email: "nopw@x.bn" }, update: {}, create: { email: "nopw@x.bn", name: "n", roles: "Admin", passwordHash: "" } });

  // 1. anonymous
  for (const [n, p] of Object.entries({
    "events GET": events.GET(req("GET", "/api/events")), "events POST": events.POST(req("POST", "/api/events", { body: {} })),
    "triage GET": triage.GET(req("GET", "/api/triage")), "triage POST": triage.POST(req("POST", "/api/triage", { body: {} })),
    "dash GET": dash.GET(req("GET", "/api/dashboard")), "staff GET": staff.GET(req("GET", "/api/staff")),
    "staff POST": staff.POST(req("POST", "/api/staff", { body: { email: "a@b.co", name: "a", roles: "Admin", password: pw } })),
    "staff DELETE": staff.DELETE(req("DELETE", "/api/staff?email=tri@x.bn")), "me": me.GET(req("GET", "/api/auth/me")) }))
    assert.equal(await status(p as any), 401, "anon " + n);
  assert(db.staffRole.rows.every((r: any) => r.email !== "a@b.co"), "anon created staff");

  // 2. login
  assert.equal((await signIn("tri@x.bn", "wrong")).r.status, 401);
  assert.equal((await signIn("nopw@x.bn", "")).r.status, 400);
  assert.equal((await signIn("nopw@x.bn", pw)).r.status, 401, "empty hash cannot sign in");
  assert.equal((await signIn("gone@x.bn")).r.status, 200);
  for (let i = 0; i < 5; i++) await signIn("victim@x.bn", "bad");
  assert.equal((await signIn("victim@x.bn", "bad")).r.status, 429, "throttle");
  const T = await signIn("tri@x.bn"), E = await signIn("ev@x.bn"), D = await signIn("cmd@x.bn"), AD = await signIn("admin@x.bn");
  assert(T.r.status === 200 && T.cookie);
  const ck = T.r.cookieJar[0]; assert(ck.httpOnly && ck.sameSite === "lax" && ck.path === "/");
  assert.equal((await login.POST(req("POST", "/api/auth/login", { body: { email: "tri@x.bn", password: pw }, origin: "http://evil.test" }))).status, 403, "login CSRF");

  // 3. forged / tampered / expired
  assert.equal(await status(me.GET(req("GET", "/api/auth/me", { cookie: T.cookie.slice(0, -3) + "abc" }))), 401);
  const [pl, sig] = T.cookie.split(".");
  const forged = Buffer.from(JSON.stringify({ e: "admin@x.bn", x: Date.now() + 1e6 })).toString("base64url") + "." + sig;
  assert.equal(await status(me.GET(req("GET", "/api/auth/me", { cookie: forged }))), 401, "forged admin");
  const realDate = Date.now; Date.now = () => realDate() + 9 * 3600_000;
  assert.equal(await status(me.GET(req("GET", "/api/auth/me", { cookie: T.cookie }))), 401, "expired"); Date.now = realDate;

  // 4. forced password change
  const TP = await signIn("temp@x.bn");
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: TP.cookie }))), 403);
  assert.equal(await status(chpw.POST(req("POST", "/api/auth/change-password", { cookie: TP.cookie, body: { currentPassword: pw, newPassword: "short" } }))), 400);
  assert.equal(await status(chpw.POST(req("POST", "/api/auth/change-password", { cookie: TP.cookie, body: { currentPassword: pw, newPassword: "BrandNew-pass9" } }))), 200);
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: TP.cookie }))), 200);

  // 5. role matrix + CSRF
  const ev = (o: any = {}) => ({ eventName: "Parade", district: "Brunei-Muara", eventType: "STATE/VVIP", environment: "Outdoor Crowded", venue: "Padang SOAS", crowdType: "Open to public", dateOfCover: "2026-10-01", selectedTier: "VVIP/SCT", doctorsPlanned: 2, paramedicsPlanned: 4, nursesPlanned: 12, driversPlanned: 3, ssNgoPlanned: 4, ssMindefPlanned: 2, walkingTeamCount: 2, walkingTeamManpower: 2, clinicPublicCount: 1, clinicPublicManpower: 4, clinicVvipCount: 1, clinicVvipManpower: 4, ambulanceTeamCount: 2, ambulanceTeamManpower: 3, victorTeamCount: 1, victorTeamManpower: 3, supportVehicleCount: 1, supportVehicleManpower: 2, clockInTime: "06:00", finalClockOutTime: "13:00", ...o });
  assert.equal(await status(events.POST(req("POST", "/api/events", { cookie: T.cookie, body: ev() }))), 403, "triage creating event");
  assert.equal(await status(events.POST(req("POST", "/api/events", { cookie: D.cookie, body: ev() }))), 403);
  assert.equal(await status(events.POST(req("POST", "/api/events", { cookie: E.cookie, body: ev(), origin: null }))), 403, "no origin");
  assert.equal(await status(events.POST(req("POST", "/api/events", { cookie: E.cookie, body: ev(), origin: "http://evil.test" }))), 403, "cross origin");
  // 8. hard control + server-authoritative fields
  const bad = await events.POST(req("POST", "/api/events", { cookie: E.cookie, body: ev({ eventType: "SPORT", environment: "Open Road", selectedTier: "Public/BLS" }) }));
  assert.equal(bad.status, 400); assert(/Tier compliance/.test(bad.body.error));
  assert.equal(await status(events.POST(req("POST", "/api/events", { cookie: E.cookie, body: ev({ eventType: "CORPORATE", environment: "Jungle/Terrain", selectedTier: "Public/BLS" }) }))), 400);
  const ok = await events.POST(req("POST", "/api/events", { cookie: E.cookie, body: ev({ id: "HACK", submittedBy: "someone@else", complianceCheck: "LIES", recommendedTier: "Public/BLS", calculatedRiskScore: 0, manpowerOverall: 999, totalManpowerPlanned: 1, nearestHospital: "X" }) }));
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const row = ok.body;
  assert.notEqual(row.id, "HACK"); assert.equal(row.submittedBy, "ev@x.bn"); assert.equal(row.complianceCheck, "Compliant");
  assert.equal(row.recommendedTier, "VVIP/SCT"); assert.equal(row.calculatedRiskScore, 3.6); assert.equal(row.totalManpowerPlanned, 27);
  assert.equal(row.manpowerOverall, 23); assert.equal(row.manpowerVariance, -4); assert.equal(row.nearestHospital, "RIPAS Hospital"); assert.equal(row.missionDuration, "7:00");
  // PUT cannot downgrade tier
  assert.equal(await status(events.PUT(req("PUT", "/api/events", { cookie: E.cookie, body: { id: row.id, eventType: "SPORT", environment: "Open Road", selectedTier: "Public/BLS" } }))), 400);
  // events GET: planning full, triage minimal, dashboard denied
  const ge = await events.GET(req("GET", "/api/events", { cookie: E.cookie })); assert.equal(ge.status, 200); assert("doctorsPlanned" in ge.body[0]);
  const gt = await events.GET(req("GET", "/api/events", { cookie: T.cookie })); assert.equal(gt.status, 200); assert(!("doctorsPlanned" in gt.body[0]) && !("submittedBy" in gt.body[0]));
  assert.equal(await status(events.GET(req("GET", "/api/events", { cookie: D.cookie }))), 403);

  // triage
  const tri = (o: any = {}) => ({ eventId: row.id, patientName: "ali bin abu", age: 30, nokContact: "0881234", triagePriority: "P1", finalOutcome: "Discharged", caseIndex: "011026/C1/PT1", doctorNotes: "SECRET NOTE", submittedBy: "spoof@x", id: "HACK", ...o });
  assert.equal(await status(triage.POST(req("POST", "/api/triage", { cookie: E.cookie, body: tri() }))), 403, "planner writing triage");
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: E.cookie }))), 403, "planner reading patients");
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: D.cookie }))), 403, "dashboard reading patients");
  assert.equal(await status(triage.POST(req("POST", "/api/triage", { cookie: T.cookie, body: tri({ eventId: "nope" }) }))), 400);
  assert.equal(await status(triage.POST(req("POST", "/api/triage", { cookie: T.cookie, body: tri({ triagePriority: "P9" }) }))), 400);
  assert.equal(await status(triage.POST(req("POST", "/api/triage", { cookie: T.cookie, body: tri({ caseIndex: "bad" }) }))), 400);
  const t1 = await triage.POST(req("POST", "/api/triage", { cookie: T.cookie, body: tri() }));
  assert.equal(t1.status, 200); assert.equal(t1.body.submittedBy, "tri@x.bn"); assert.notEqual(t1.body.id, "HACK"); assert.equal(t1.body.patientName, "ALI BIN ABU");
  assert.equal(await status(triage.POST(req("POST", "/api/triage", { cookie: T.cookie, body: tri() }))), 400, "dup case index");
  await triage.POST(req("POST", "/api/triage", { cookie: T.cookie, body: tri({ caseIndex: "011026/C1/PT2", triagePriority: "P2", finalOutcome: "Against Medical Advice (AMA)", hospitalTransport: true }) }));

  // 10. dashboard privacy
  assert.equal(await status(dash.GET(req("GET", "/api/dashboard", { cookie: T.cookie }))), 403);
  assert.equal(await status(dash.GET(req("GET", "/api/dashboard", { cookie: E.cookie }))), 403);
  const dd = await dash.GET(req("GET", "/api/dashboard", { cookie: D.cookie })); assert.equal(dd.status, 200);
  const js = JSON.stringify(dd.body);
  for (const leak of ["ALI", "0881234", "SECRET", "011026/C1", "tri@x.bn", "ev@x.bn"]) assert(!js.includes(leak), "dashboard leaks " + leak);
  assert.equal(dd.body.totalTriage, 2); assert.equal(dd.body.p1Count, 1); assert.equal(dd.body.amaCount, 1); assert.equal(dd.body.totalClinics, 2);

  // 11. staff
  const sl = await staff.GET(req("GET", "/api/staff", { cookie: AD.cookie })); assert.equal(sl.status, 200);
  assert(!JSON.stringify(sl.body).includes("scrypt") && !JSON.stringify(sl.body).includes("passwordHash"), "hash leaked");
  for (const c of [T, E, D]) assert.equal(await status(staff.GET(req("GET", "/api/staff", { cookie: c.cookie }))), 403);
  assert.equal(await status(staff.POST(req("POST", "/api/staff", { cookie: T.cookie, body: { email: "tri@x.bn", name: "x", roles: "Admin" } }))), 403, "self-promotion");
  const made = await staff.POST(req("POST", "/api/staff", { cookie: AD.cookie, body: { email: "New@X.bn", name: "New", roles: ["Triage"], password: "Another-pass12" } }));
  assert.equal(made.status, 200); assert(!("passwordHash" in made.body)); assert.equal(made.body.email, "new@x.bn"); assert.equal(made.body.mustChangePassword, true);
  assert.equal(await status(staff.POST(req("POST", "/api/staff", { cookie: AD.cookie, body: { email: "w@x.bn", name: "w", roles: "Bogus" } }))), 400);
  assert.equal(await status(staff.POST(req("POST", "/api/staff", { cookie: AD.cookie, body: { email: "w@x.bn", name: "w", roles: "Triage", password: "short" } }))), 400);
  assert.equal(await status(staff.DELETE(req("DELETE", "/api/staff?email=admin@x.bn", { cookie: AD.cookie }))), 400, "self-delete");
  assert.equal(await status(staff.POST(req("POST", "/api/staff", { cookie: AD.cookie, body: { email: "admin@x.bn", name: "a", roles: "Admin", active: false } }))), 400, "self-suspend");
  // 7. suspension is immediate
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: T.cookie }))), 200);
  await staff.POST(req("POST", "/api/staff", { cookie: AD.cookie, body: { email: "tri@x.bn", name: "tri", roles: "Triage", active: false } }));
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: T.cookie }))), 401, "suspended session must die");
  // role change is immediate
  await staff.POST(req("POST", "/api/staff", { cookie: AD.cookie, body: { email: "ev@x.bn", name: "ev", roles: "Dashboard" } }));
  assert.equal(await status(events.POST(req("POST", "/api/events", { cookie: E.cookie, body: ev() }))), 403, "demoted");
  // admin passes everything
  assert.equal(await status(triage.GET(req("GET", "/api/triage", { cookie: AD.cookie }))), 200);
  assert.equal(await status(dash.GET(req("GET", "/api/dashboard", { cookie: AD.cookie }))), 200);
  // audit log
  assert.equal(await status(auditRoute.GET(req("GET", "/api/audit"))), 401);
  assert.equal(await status(auditRoute.GET(req("GET", "/api/audit", { cookie: D.cookie }))), 403);
  const al = await auditRoute.GET(req("GET", "/api/audit", { cookie: AD.cookie })); assert.equal(al.status, 200);
  const acts = new Set(al.body.map((r: any) => r.action));
  for (const a of ["auth.login", "auth.login_failed", "auth.password_changed", "staff.save", "staff.delete", "triage.view", "triage.create", "event.create", "event.rejected_tier", "access.denied"].filter(x => x !== "staff.delete")) assert(acts.has(a), "missing audit action " + a);
  const ajs = JSON.stringify(al.body);
  for (const leak of ["Passw0rd", "BrandNew", "Another-pass", "ALI BIN ABU", "0881234", "SECRET", "scrypt"]) assert(!ajs.includes(leak), "audit leaks " + leak);
  assert(al.body.some((r: any) => r.action === "auth.login_failed" && r.actor === "tri@x.bn"));
  console.log("ALL AUTH/ROLE TESTS PASSED");
})().catch(e => { console.error(e); process.exit(1); });
