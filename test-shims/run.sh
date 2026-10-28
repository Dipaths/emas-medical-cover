#!/usr/bin/env bash
# Logic-level test of the auth/role layer WITHOUT installing Next/Prisma: uses in-memory stand-ins.
# (A real `bun install && bun run build` plus a manual login test is still required before go-live.)
set -e; cd "$(dirname "$0")/.."
mkdir -p node_modules/@prisma/client node_modules/next
cp test-shims/stubs/prisma/index.js node_modules/@prisma/client/index.js
cp test-shims/stubs/next/server.js node_modules/next/server.js
trap 'rm -rf node_modules/@prisma/client node_modules/next; rmdir node_modules/@prisma node_modules 2>/dev/null || true' EXIT
npx tsx --tsconfig test-shims/tsconfig.json test-shims/auth.test.ts
