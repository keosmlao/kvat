#!/usr/bin/env bash
# Regenerate prisma/master/tenant-schema.sql from the current kvat database.
# Run after every change to prisma/schema.prisma so newly provisioned tenants
# pick up the new shape.
#
#   npm run dump:tenant-schema
#
set -euo pipefail

DB="${KVAT_DB:-kvat}"
HOST="${KVAT_HOST:-localhost}"
USER="${KVAT_USER:-itdpt}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/prisma/master/tenant-schema.sql"

PG_DUMP="${PG_DUMP:-pg_dump}"
if ! command -v "$PG_DUMP" >/dev/null 2>&1; then
  for cand in \
    /opt/homebrew/Cellar/postgresql@17/*/bin/pg_dump \
    /opt/homebrew/opt/postgresql@17/bin/pg_dump \
    /usr/local/opt/postgresql@17/bin/pg_dump; do
    if [ -x "$cand" ]; then PG_DUMP="$cand"; break; fi
  done
fi

if ! command -v "$PG_DUMP" >/dev/null 2>&1 && [ ! -x "$PG_DUMP" ]; then
  echo "pg_dump not found. Set PG_DUMP=/path/to/pg_dump or install postgresql." >&2
  exit 1
fi

TMP="$(mktemp)"
"$PG_DUMP" -h "$HOST" -U "$USER" --schema-only --no-owner --no-privileges -d "$DB" > "$TMP"

# Strip psql meta-commands (\restrict, \unrestrict, \connect) — node-postgres
# doesn't understand them, only the psql REPL does.
sed -E '/^\\(restrict|unrestrict|connect|c |!)/d' "$TMP" > "$OUT"
rm "$TMP"

LINES=$(wc -l < "$OUT" | tr -d ' ')
TABLES=$(grep -c "CREATE TABLE" "$OUT" || true)
echo "✓ Wrote $OUT ($LINES lines, $TABLES tables)"
