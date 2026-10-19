// Jeu de données de développement : un club, un championnat, un effectif avec
// cartes, un match ouvert et un match joué à saisir.
//
// Usage : DATABASE_URL=... node prisma/seed-dev.js
// À n'exécuter que sur une base de développement — le script vide les tables.

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ROSTER = [
  ["Sofiane", "Bakkali", "MOC", 82, "ADMIN"],
  ["Karim", "Vidal", "Ailier", 79, "PLAYER"],
  ["Yanis", "Trégo", "Gardien", 77, "PLAYER"],
  ["Théo", "Danet", "Attaquant", 76, "PLAYER"],
  ["Adam", "Meziane", "Défenseur", 74, "PLAYER"],
  ["Lucas", "Pereira", "Latéral", 71, "PLAYER"],
  ["Nathan", "Boury", "Milieu", 70, "PLAYER"],
  ["Rayan", "Cissé", "Milieu", 68, "PLAYER"],
];

// Socle des six stats par poste, aligné sur frontend/src/lib/card-rules.ts
const BASE = {
  Gardien: { pace: 55, shooting: 35, passing: 55, dribbling: 45, defending: 70, physical: 68 },
  Défenseur: { pace: 62, shooting: 45, passing: 62, dribbling: 55, defending: 80, physical: 78 },
  Latéral: { pace: 78, shooting: 52, passing: 68, dribbling: 68, defending: 72, physical: 70 },
  Milieu: { pace: 68, shooting: 65, passing: 78, dribbling: 72, defending: 68, physical: 70 },
  MOC: { pace: 72, shooting: 76, passing: 78, dribbling: 79, defending: 48, physical: 62 },
  Ailier: { pace: 84, shooting: 72, passing: 70, dribbling: 82, defending: 42, physical: 60 },
  Attaquant: { pace: 78, shooting: 84, passing: 64, dribbling: 74, defending: 38, physical: 72 },
};

async function main() {
  // Nettoyage, dans l'ordre des dépendances.
  await prisma.clubMatchStat.deleteMany();
  await prisma.clubMatchRegistration.deleteMany();
  await prisma.clubMatch.deleteMany();
  await prisma.playerMatchStat.deleteMany();
  await prisma.match.deleteMany();
  await prisma.awardVote.deleteMany();
  await prisma.awardNomination.deleteMany();
  await prisma.award.deleteMany();
  await prisma.tournamentTeam.deleteMany();
  await prisma.challengeEntry.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.playerCard.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.privateMessage.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const team = await prisma.team.create({ data: { name: "FC MONDAY" } });

  const profiles = [];
  for (const [firstName, lastName, position, overall, role] of ROSTER) {
    const username = `${firstName}${lastName}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

    const user = await prisma.user.create({
      data: {
        email: `${username}@fcmonday.fr`,
        username,
        passwordHash,
        role,
      },
    });

    const profile = await prisma.playerProfile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        position,
        strongFoot: "Droit",
        heightCm: 175 + (overall % 12),
        weightKg: 68 + (overall % 9),
        currentClub: team.name,
        shirtNumber: profiles.length + 7,
      },
    });

    await prisma.playerCard.create({
      data: { playerProfileId: profile.id, overallRating: overall, ...BASE[position] },
    });

    await prisma.teamMember.create({
      data: { teamId: team.id, playerProfileId: profile.id },
    });

    profiles.push({ user, profile });
  }

  const admin = profiles[0];

  const championship = await prisma.tournament.create({
    data: {
      name: "Championnat interne 25/26",
      type: "LEAGUE",
      season: "25/26",
      createdById: admin.user.id,
    },
  });
  await prisma.tournamentTeam.create({
    data: { tournamentId: championship.id, teamId: team.id },
  });

  // Quelques actions dans le feed.
  const captions = [
    ["But", "Contrôle orienté puis frappe enroulée. 72e, 2-1."],
    ["Geste technique", "Petit pont dans le couloir, la vidéo parle d'elle-même."],
    ["Arrêt", "Double arrêt sur la ligne. Clean sheet gardée."],
  ];
  for (let i = 0; i < captions.length; i++) {
    await prisma.post.create({
      data: {
        userId: profiles[i].user.id,
        title: captions[i][0],
        description: captions[i][1],
        type: "VIDEO",
        videoUrl: "",
        createdAt: new Date(Date.now() - (i + 1) * 3600_000 * 5),
      },
    });
  }

  // Match à venir, inscriptions ouvertes.
  const upcoming = await prisma.clubMatch.create({
    data: {
      teamId: team.id,
      tournamentId: championship.id,
      matchDate: new Date(Date.now() + 4 * 864e5),
      round: 8,
      maxPlayers: 16,
      status: "OPEN",
      createdById: admin.user.id,
    },
  });
  for (const p of profiles.slice(1, 6)) {
    await prisma.clubMatchRegistration.create({
      data: { clubMatchId: upcoming.id, playerProfileId: p.profile.id, userId: p.user.id },
    });
  }

  // Match joué, feuille encore vide : c'est celui que l'admin doit saisir.
  const played = await prisma.clubMatch.create({
    data: {
      teamId: team.id,
      tournamentId: championship.id,
      matchDate: new Date(Date.now() - 864e5),
      round: 7,
      maxPlayers: 16,
      status: "COMPLETED",
      createdById: admin.user.id,
    },
  });
  for (const p of profiles) {
    await prisma.clubMatchRegistration.create({
      data: { clubMatchId: played.id, playerProfileId: p.profile.id, userId: p.user.id },
    });
  }

  // Match en cours, avec quelques faits de jeu : alimente l'onglet Direct.
  const live = await prisma.clubMatch.create({
    data: {
      teamId: team.id,
      tournamentId: championship.id,
      matchDate: new Date(Date.now() - 45 * 60_000),
      round: 8,
      maxPlayers: 16,
      status: "IN_PROGRESS",
      createdById: admin.user.id,
    },
  });
  for (const p of profiles) {
    await prisma.clubMatchRegistration.create({
      data: { clubMatchId: live.id, playerProfileId: p.profile.id, userId: p.user.id },
    });
  }
  const liveFacts = [
    [0, 1, 0], // Sofiane : 1 but
    [3, 1, 0], // Théo : 1 but
    [1, 0, 1], // Karim : 1 passe
  ];
  for (const [idx, goals, assists] of liveFacts) {
    await prisma.clubMatchStat.create({
      data: {
        clubMatchId: live.id,
        playerProfileId: profiles[idx].profile.id,
        teamId: team.id,
        goals,
        assists,
      },
    });
  }

  // Prix de fin de saison, avec un vote.
  const award = await prisma.award.create({
    data: {
      type: "BALLON_DOR",
      name: "Ballon d'Or du club",
      season: "24/25",
      tournamentId: championship.id,
    },
  });
  const nomination = await prisma.awardNomination.create({
    data: { awardId: award.id, playerProfileId: admin.profile.id },
  });
  await prisma.awardVote.create({
    data: { awardId: award.id, userId: profiles[1].user.id, nominationId: nomination.id },
  });

  console.log("Seed OK");
  console.log(`  club        ${team.name} (${profiles.length} joueurs)`);
  console.log(`  admin       ${admin.user.email} / password123`);
  console.log(`  match ouvert   ${upcoming.id}`);
  console.log(`  feuille à saisir ${played.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
