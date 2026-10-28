/**
 * Create or reset an account (run once to bootstrap the first Admin):
 *   AUTH_SECRET=... bun scripts/create-admin.ts admin@yourdomain.gov.bn "Full Name" 'a-long-password1' [Roles]
 * Roles default to Admin. The user is forced to change the password at first sign-in.
 */
import { db } from "../src/lib/db";
import { hashPassword, passwordProblem, parseRoles } from "../src/lib/auth";

async function main() {
  const [email, name, password, roles = "Admin"] = process.argv.slice(2);
  if (!email || !name || !password) { console.error("Usage: create-admin.ts <email> <name> <password> [roles]"); process.exit(1); }
  const problem = passwordProblem(password);
  if (problem) { console.error(problem); process.exit(1); }
  const r = parseRoles(roles);
  if (!r.length) { console.error("No valid roles in:", roles); process.exit(1); }
  const data = { name, roles: r.join(","), active: true, passwordHash: hashPassword(password), mustChangePassword: true };
  await db.staffRole.upsert({ where: { email: email.toLowerCase() }, update: data, create: { email: email.toLowerCase(), ...data } });
  console.log(`OK: ${email.toLowerCase()} → ${r.join(",")} (must change password at first sign-in)`);
}
main().finally(() => db.$disconnect());
