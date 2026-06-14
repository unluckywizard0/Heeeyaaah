#!/usr/bin/env bash
# Hermetic RLS isolation test (KAN-56). Applies the auth bootstrap, every
# migration in order, then the isolation assertions — against a throwaway
# Postgres. No Supabase project required.
#
# Local use (needs a running Postgres you can throw away):
#   createdb nerdos_rls_test
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/nerdos_rls_test \
#     npm run test:rls
#
# CI provides DATABASE_URL pointing at the postgres service container.
set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

psql_run() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 --quiet --no-psqlrc "$@"
}

echo "→ Applying auth bootstrap"
psql_run -f "$ROOT/supabase/tests/00_auth_bootstrap.sql"

echo "→ Applying migrations"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "    $(basename "$migration")"
  psql_run -f "$migration"
done

echo "→ Running RLS isolation assertions"
psql_run -f "$ROOT/supabase/tests/rls_isolation.test.sql"
