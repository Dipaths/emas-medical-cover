# EMAS web app — sign-in, roles and setup

## What is enforced (server-side, every API route)
| Route | Who may call it |
|---|---|
| `POST /api/auth/login`, `logout`, `GET /api/auth/me`, `POST /api/auth/change-password` | login public (throttled); the rest need a session |
| `GET/POST/PUT /api/events` | `EventPlanning` (full); `Triage` may only list events (id, name, date, venue, district); `Admin` all |
| `GET/POST /api/triage` | `Triage` (+ `Admin`) only — patient-identifiable data |
| `GET /api/dashboard` | `Dashboard` (+ `Admin`). Never reads patient names, contact details, case index, clinical free text, or submitter e-mails |
| `/api/staff` (list/create/update/delete) | `Admin` only; never returns password hashes; cannot suspend/delete yourself |

* Passwords: scrypt hashes, min. 10 chars with letters + a number. Admin-set passwords are temporary — the user must change them at first sign-in.
* Sessions: HMAC-signed httpOnly cookie, 8 h, re-checked against the staff table on **every** request (suspending an account or changing roles takes effect immediately).
* CSRF: all writes must carry a same-origin `Origin` header; cookie is SameSite=Lax; `Secure` in production.
* Login throttling: 5 failures / 15 min per account, 30 per IP (in memory, per process).
* Event records: risk score, recommended tier, hospitals, compliance, manpower totals, variances and durations are **recomputed on the server**; client-sent values are ignored, and a selected tier below the recommended minimum is rejected (Framework 5.5 hard control). Submitter is taken from the session, never from the request body. Unknown/extra fields are dropped.
* Security headers: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Cache-Control: no-store` on `/api`.

## Audit log
Every sign-in and failed sign-in, password change, role denial (`access.denied`), staff change, event create/update, tier-rejection, triage record create, and every **view of the patient list** is written to the `AuditLog` table by the server (who, when, action, target, IP). Admins read it in the **Audit** tab (`GET /api/audit`, filterable by action prefix). There is no API to edit or delete entries. Passwords and patient-identifying data are never written to it (triage entries record the event name and case index only). Failed-login entries are bounded by the login throttle.

## Phone use
* The layout is responsive: scrolling tab bar, one-column forms on small screens, larger touch targets, 16 px inputs (no iOS zoom), a sticky submit button, safe-area padding for notched phones.
* Installable: over **HTTPS**, open the site on the phone → Android Chrome: menu → *Install app*; iPhone Safari: Share → *Add to Home Screen*. It then opens full-screen like an app (manifest, icons and a small service worker are in `public/`).
* **Not an offline app.** Records still need a connection to save. The service worker only caches static files and shows an offline page that points staff to the paper process (Offline Fallback SOP). It never caches `/api` data.
* Not verified on real devices (see below).

## First-time setup
1. `cp .env.example .env`, then set `AUTH_SECRET` (`openssl rand -base64 48`). The server refuses to authenticate without it.
2. `bun install && bun run db:push` — adds the two new `StaffRole` columns and the `AuditLog` table. Existing/seeded accounts have **no password**, so they cannot sign in until you set one.
3. Create the first admin: `bun scripts/create-admin.ts you@domain.gov.bn "Your Name" 'a-long-password1'` (extra accounts: add a 4th argument, e.g. `Triage`).
4. Serve over **HTTPS** (the bundled `Caddyfile` is the place to terminate TLS). `COOKIE_INSECURE=1` exists only for plain-http test boxes.
5. Sign in, change the temporary password, then add everyone else from the **Staff** tab.

Staff management: sign in as an Admin and open the **Staff** tab to add people, assign roles (several per person allowed), reset a password (the user must change it at next sign-in), suspend/reactivate, or delete. You cannot suspend or delete your own account.

## Tested vs not tested
* Tested (`bash test-shims/run.sh`): the route handlers and auth library against in-memory stand-ins for Prisma/Next — anonymous access, wrong role, forged/tampered/expired cookies, CSRF, throttling, forced password change, immediate suspension/demotion, tier hard-block, server-authoritative fields, mass-assignment, no PII on the dashboard, staff-API rules. The audit trail (including that it never contains passwords or patient names) is covered by the same tests. TSX files (Staff and Audit tabs, layout, PWA registration) were syntax-checked only.
* **Not tested:** `next build`, the real Prisma client, and the login, Staff, Audit screens and the phone layout/install flow in a browser or on a real phone — the package registry was unreachable from this environment. Run the build and one manual end-to-end login before go-live.

## Known gaps
* Audit entries live in the same database; ship/back them up off-box if you need tamper-resistance. Patient data sits unencrypted in `db/custom.db` — protect/back up the host disk accordingly.
* Throttling is per process (resets on restart; not shared across instances).
* The page header shows hotline 995; the triage form elsewhere in this package shows +673 888 5920 — confirm which is correct.
