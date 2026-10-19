-- La colonne « round » (journée de championnat) est déclarée dans
-- schema.prisma mais n'était créée par aucune migration.
-- Idempotent : la base de production la possède déjà.

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "round" INTEGER;
