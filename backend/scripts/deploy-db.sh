#!/usr/bin/env bash
# Déploiement schéma Prisma sur une base éventuellement déjà peuplée
# (tables Expo / Supabase SQL). Évite P3005 sur migrate deploy.
set -euo pipefail

npx prisma generate

if npx prisma migrate deploy; then
  echo "[deploy-db] migrate deploy OK"
  exit 0
fi

echo "[deploy-db] migrate deploy a échoué (souvent P3005 : schéma non vide)."
echo "[deploy-db] Fallback : db push puis baseline des migrations."

npx prisma db push --skip-generate

for m in prisma/migrations/*; do
  [ -d "$m" ] || continue
  name="$(basename "$m")"
  npx prisma migrate resolve --applied "$name" 2>/dev/null || true
done

echo "[deploy-db] baseline terminée"
