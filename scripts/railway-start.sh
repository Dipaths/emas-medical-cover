#!/bin/sh
set -e
export HOSTNAME=0.0.0.0
bunx prisma db push --skip-generate
bun scripts/bootstrap-admin.ts
exec bun .next/standalone/server.js
