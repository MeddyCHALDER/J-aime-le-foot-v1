-- PlayerMatchStat et l'enum MatchResult étaient déclarés dans schema.prisma
-- mais aucune migration ne les créait : une base neuve échouait à
-- « 20251210140000_add_club_matches », qui référence le type MatchResult.
--
-- Cette migration est volontairement idempotente : la base de production,
-- construite sans passer par les migrations, possède déjà ces objets.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchResult') THEN
    CREATE TYPE "MatchResult" AS ENUM ('WIN', 'DRAW', 'LOSS');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlayerMatchStat" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER,
    "matchResult" "MatchResult",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerMatchStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerMatchStat_matchId_playerProfileId_key"
    ON "PlayerMatchStat"("matchId", "playerProfileId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlayerMatchStat_matchId_fkey') THEN
    ALTER TABLE "PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlayerMatchStat_playerProfileId_fkey') THEN
    ALTER TABLE "PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_playerProfileId_fkey"
      FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlayerMatchStat_tournamentId_fkey') THEN
    ALTER TABLE "PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_tournamentId_fkey"
      FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
