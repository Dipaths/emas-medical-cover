#!/usr/bin/env bash
# Nightly SQLite backup (cron: 15 2 * * * /opt/emas-web/deploy/backup.sh). Keeps 30 days.
# The database holds patient data: store backups encrypted and off the server, per MOH/EMAS policy.
set -euo pipefail
DB=/var/lib/emas/custom.db; OUT=/var/backups/emas; mkdir -p "$OUT"; chmod 700 "$OUT"
sqlite3 "$DB" ".backup '$OUT/emas-$(date +%F).db'"
find "$OUT" -name 'emas-*.db' -mtime +30 -delete
