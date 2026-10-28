/** On first start only: create an Admin from ADMIN_EMAIL / ADMIN_PASSWORD env vars if no active Admin exists. */
import { db } from "../src/lib/db";
import { hashPassword, passwordProblem } from "../src/lib/auth";
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase(), pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) { console.log("bootstrap: ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping"); return; }
  const admins = (await db.staffRole.findMany({ where: { active: true } })).filter((s) => s.roles.split(",").includes("Admin"));
  if (admins.length) { console.log("bootstrap: an Admin already exists, skipping"); return; }
  const p = passwordProblem(pw); if (p) { console.error("bootstrap:", p); return; }
  await db.staffRole.create({ data: { email, name: process.env.ADMIN_NAME || "Administrator", roles: "Admin", active: true, passwordHash: hashPassword(pw), mustChangePassword: true } });
  console.log("bootstrap: created Admin", email, "(must change password at first sign-in)");
}
main().catch((e) => console.error("bootstrap failed:", e)).finally(() => db.$disconnect());
