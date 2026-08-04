#!/bin/sh
set -eu

mkdir -p "$(dirname "${DB_URL}")"
export DATABASE_URL="sqlite:${DB_URL}"
dbmate --migrations-dir /app/migrations --no-dump-schema up

# sqlite3 $DB_URL < /app/fixtures/sample-data.sql

if [ "$#" -eq 0 ]; then
  set -- monthly-py
fi

exec "$@"
