-- CreateEnum
CREATE TYPE "ClubMatchStatus" AS ENUM ('OPEN', 'CLOSED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "ClubMatch" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "round" INTEGER,
    "status" "ClubMatchStatus" NOT NULL DEFAULT 'OPEN',
    "maxPlayers" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMatchRegistration" (
    "id" TEXT NOT NULL,
    "clubMatchId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMatchRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMatchStat" (
    "id" TEXT NOT NULL,
    "clubMatchId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "teamId" TEXT,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER,
    "matchResult" "MatchResult",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMatchStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubMatch_teamId_matchDate_idx" ON "ClubMatch"("teamId", "matchDate");

-- CreateIndex
CREATE INDEX "ClubMatch_status_idx" ON "ClubMatch"("status");

-- CreateIndex
CREATE INDEX "ClubMatch_tournamentId_idx" ON "ClubMatch"("tournamentId");

-- CreateIndex
CREATE INDEX "ClubMatchRegistration_clubMatchId_idx" ON "ClubMatchRegistration"("clubMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMatchRegistration_clubMatchId_playerProfileId_key" ON "ClubMatchRegistration"("clubMatchId", "playerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMatchStat_clubMatchId_playerProfileId_key" ON "ClubMatchStat"("clubMatchId", "playerProfileId");

-- AddForeignKey
ALTER TABLE "ClubMatch" ADD CONSTRAINT "ClubMatch_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatch" ADD CONSTRAINT "ClubMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatch" ADD CONSTRAINT "ClubMatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatchRegistration" ADD CONSTRAINT "ClubMatchRegistration_clubMatchId_fkey" FOREIGN KEY ("clubMatchId") REFERENCES "ClubMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatchRegistration" ADD CONSTRAINT "ClubMatchRegistration_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatchRegistration" ADD CONSTRAINT "ClubMatchRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatchStat" ADD CONSTRAINT "ClubMatchStat_clubMatchId_fkey" FOREIGN KEY ("clubMatchId") REFERENCES "ClubMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatchStat" ADD CONSTRAINT "ClubMatchStat_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatchStat" ADD CONSTRAINT "ClubMatchStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

