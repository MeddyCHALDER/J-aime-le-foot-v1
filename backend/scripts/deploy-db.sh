#!/usr/bin/env bash
# Tables Express dans le schéma Postgres "jlf" (pas public/auth Expo).
# db push uniquement : les migrations historiques ciblaient public.
set -euo pipefail

npx prisma generate
npx prisma db push --skip-generate --accept-data-loss=false

echo "[deploy-db] schéma jlf synchronisé"
