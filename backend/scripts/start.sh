#!/bin/sh
# Container entrypoint: bring the database up to date, seed reference/demo data
# (both idempotent and fast after the first boot), then serve.
set -e
alembic upgrade head
python -m scripts.seed_airports --if-empty
python -m scripts.seed_demo
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" \
  --proxy-headers --forwarded-allow-ips='*'
