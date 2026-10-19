const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Récupérer tous les profils joueurs (pour les admins)
router.get("/all", async (req, res) => {
  try {
    const profiles = await prisma.playerProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
      },
      orderBy: {
        lastName: "asc",
      },
    });
    res.json(profiles);
  } catch (err) {
    console.error("Erreur GET /players/all", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer le profil joueur du user connecté
// Doit rester AVANT `/:id`, sinon Express fait correspondre "me" à un identifiant.
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }
    return res.json(profile);
  } catch (err) {
    console.error("Erreur GET /players/me", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Profil public d'un joueur (par ID de profil)
router.get("/:id", async (req, res) => {
  try {
    const profile = await prisma.playerProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        cards: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    // Stats globales du joueur : matchs officiels et matchs intra-club.
    // Les deux comptent — c'est le cumul que le joueur voit sur son profil.
    const [matchStats, clubStats] = await Promise.all([
      prisma.playerMatchStat.findMany({
        where: { playerProfileId: profile.id },
        include: {
          match: {
            include: {
              tournament: {
                select: { id: true, name: true, type: true },
              },
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.clubMatchStat.findMany({
        where: { playerProfileId: profile.id },
        include: {
          clubMatch: {
            include: {
              tournament: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      }),
    ]);

    // On ramène les stats intra-club à la même forme que les stats officielles,
    // pour que l'agrégation ci-dessous n'ait qu'un seul cas à traiter.
    const stats = [
      ...matchStats,
      ...clubStats.map((s) => ({
        ...s,
        tournamentId: s.clubMatch.tournamentId,
        match: { tournament: s.clubMatch.tournament },
      })),
    ];

    // Agréger les stats
    const aggregatedStats = {
      totalGoals: 0,
      totalAssists: 0,
      totalMatches: stats.length,
      totalWins: 0,
      totalDraws: 0,
      totalLosses: 0,
      totalPoints: 0,
      championships: [],
    };

    const championshipStats = {};

    stats.forEach((stat) => {
      aggregatedStats.totalGoals += stat.goals;
      aggregatedStats.totalAssists += stat.assists;

      if (stat.matchResult === "WIN") {
        aggregatedStats.totalWins += 1;
        aggregatedStats.totalPoints += 3;
      } else if (stat.matchResult === "DRAW") {
        aggregatedStats.totalDraws += 1;
        aggregatedStats.totalPoints += 1;
      } else if (stat.matchResult === "LOSS") {
        aggregatedStats.totalLosses += 1;
      }

      // Stats par championnat.
      // Un match intra-club amical n'est rattaché à aucun championnat : il
      // compte dans le cumul global, mais pas dans une ligne de compétition.
      if (stat.match.tournament && stat.match.tournament.type === "LEAGUE") {
        const champId = stat.tournamentId;
        if (!championshipStats[champId]) {
          championshipStats[champId] = {
            id: stat.match.tournament.id,
            name: stat.match.tournament.name,
            goals: 0,
            assists: 0,
            matches: 0,
            points: 0,
          };
        }
        championshipStats[champId].goals += stat.goals;
        championshipStats[champId].assists += stat.assists;
        championshipStats[champId].matches += 1;
        if (stat.matchResult === "WIN") {
          championshipStats[champId].points += 3;
        } else if (stat.matchResult === "DRAW") {
          championshipStats[champId].points += 1;
        }
      }
    });

    aggregatedStats.championships = Object.values(championshipStats);

    res.json({
      profile,
      stats: aggregatedStats,
    });
  } catch (err) {
    console.error("Erreur GET /players/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Profil public d'un joueur (par username)
router.get("/username/:username", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: {
        playerProfile: {
          include: {
            cards: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.playerProfile) {
      return res.status(404).json({ error: "Joueur non trouvé" });
    }

    // Récupérer les stats (même logique que ci-dessus)
    const stats = await prisma.playerMatchStat.findMany({
      where: { playerProfileId: user.playerProfile.id },
      include: {
        match: {
          include: {
            tournament: {
              select: { id: true, name: true, type: true },
            },
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        },
      },
    });

    const aggregatedStats = {
      totalGoals: 0,
      totalAssists: 0,
      totalMatches: stats.length,
      totalWins: 0,
      totalDraws: 0,
      totalLosses: 0,
      totalPoints: 0,
      championships: [],
    };

    const championshipStats = {};

    stats.forEach((stat) => {
      aggregatedStats.totalGoals += stat.goals;
      aggregatedStats.totalAssists += stat.assists;

      if (stat.matchResult === "WIN") {
        aggregatedStats.totalWins += 1;
        aggregatedStats.totalPoints += 3;
      } else if (stat.matchResult === "DRAW") {
        aggregatedStats.totalDraws += 1;
        aggregatedStats.totalPoints += 1;
      } else if (stat.matchResult === "LOSS") {
        aggregatedStats.totalLosses += 1;
      }

      if (stat.match.tournament.type === "LEAGUE") {
        const champId = stat.tournamentId;
        if (!championshipStats[champId]) {
          championshipStats[champId] = {
            id: stat.match.tournament.id,
            name: stat.match.tournament.name,
            goals: 0,
            assists: 0,
            matches: 0,
            points: 0,
          };
        }
        championshipStats[champId].goals += stat.goals;
        championshipStats[champId].assists += stat.assists;
        championshipStats[champId].matches += 1;
        if (stat.matchResult === "WIN") {
          championshipStats[champId].points += 3;
        } else if (stat.matchResult === "DRAW") {
          championshipStats[champId].points += 1;
        }
      }
    });

    aggregatedStats.championships = Object.values(championshipStats);

    res.json({
      profile: {
        ...user.playerProfile,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      stats: aggregatedStats,
    });
  } catch (err) {
    console.error("Erreur GET /players/username/:username", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un profil joueur pour le user connecté
router.post("/", auth, async (req, res) => {
  const {
    firstName,
    lastName,
    birthDate,
    position,
    strongFoot,
    heightCm,
    weightKg,
    currentClub,
    shirtNumber,
    avatarUrl,
  } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "firstName et lastName sont requis" });
  }

  try {
    const existing = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (existing) {
      return res.status(409).json({ error: "Un profil existe déjà pour cet utilisateur" });
    }

    const profile = await prisma.playerProfile.create({
      data: {
        userId: req.user.id,
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : null,
        position: position || null,
        strongFoot: strongFoot || null,
        heightCm: heightCm ?? null,
        weightKg: weightKg ?? null,
        currentClub: currentClub || null,
        shirtNumber: shirtNumber ?? null,
        avatarUrl: avatarUrl || null,
      },
    });

    return res.status(201).json(profile);
  } catch (err) {
    console.error("Erreur POST /players", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour le profil joueur du user connecté
router.put("/me", auth, async (req, res) => {
  const {
    firstName,
    lastName,
    birthDate,
    position,
    strongFoot,
    heightCm,
    weightKg,
    currentClub,
    shirtNumber,
    avatarUrl,
  } = req.body;

  try {
    const existing = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    const profile = await prisma.playerProfile.update({
      where: { userId: req.user.id },
      data: {
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        birthDate: birthDate ? new Date(birthDate) : null,
        position: position ?? existing.position,
        strongFoot: strongFoot ?? existing.strongFoot,
        heightCm: heightCm ?? existing.heightCm,
        weightKg: weightKg ?? existing.weightKg,
        currentClub: currentClub ?? existing.currentClub,
        shirtNumber: shirtNumber ?? existing.shirtNumber,
        avatarUrl: avatarUrl ?? existing.avatarUrl,
      },
    });

    return res.json(profile);
  } catch (err) {
    console.error("Erreur PUT /players/me", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ---------------------------
// Cartes joueur (PlayerCard)
// ---------------------------

// Récupérer la carte du profil du user connecté
router.get("/me/card", auth, async (req, res) => {
  try {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    const card = await prisma.playerCard.findFirst({
      where: { playerProfileId: profile.id },
    });

    if (!card) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    return res.json(card);
  } catch (err) {
    console.error("Erreur GET /players/me/card", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer une carte pour le profil du user connecté
router.post("/me/card", auth, async (req, res) => {
  const {
    overallRating,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    imageUrl,
  } = req.body;

  if (
    overallRating === undefined ||
    pace === undefined ||
    shooting === undefined ||
    passing === undefined ||
    dribbling === undefined ||
    defending === undefined ||
    physical === undefined
  ) {
    return res.status(400).json({
      error:
        "overallRating, pace, shooting, passing, dribbling, defending, physical sont requis",
    });
  }

  try {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    const existingCard = await prisma.playerCard.findFirst({
      where: { playerProfileId: profile.id },
    });
    if (existingCard) {
      return res.status(409).json({ error: "Une carte existe déjà pour ce profil" });
    }

    const card = await prisma.playerCard.create({
      data: {
        playerProfileId: profile.id,
        overallRating,
        pace,
        shooting,
        passing,
        dribbling,
        defending,
        physical,
        imageUrl: imageUrl || null,
      },
    });

    return res.status(201).json(card);
  } catch (err) {
    console.error("Erreur POST /players/me/card", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour la carte du profil du user connecté
router.put("/me/card", auth, async (req, res) => {
  const {
    overallRating,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    imageUrl,
  } = req.body;

  try {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    const card = await prisma.playerCard.findFirst({
      where: { playerProfileId: profile.id },
    });
    if (!card) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    const updated = await prisma.playerCard.update({
      where: { id: card.id },
      data: {
        overallRating: overallRating ?? card.overallRating,
        pace: pace ?? card.pace,
        shooting: shooting ?? card.shooting,
        passing: passing ?? card.passing,
        dribbling: dribbling ?? card.dribbling,
        defending: defending ?? card.defending,
        physical: physical ?? card.physical,
        imageUrl: imageUrl ?? card.imageUrl,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Erreur PUT /players/me/card", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour la carte d'un joueur (Admin seulement)
// C'est ce que déclenche la validation d'une feuille de match : les stats
// saisies sur le terrain recalculent la carte de chaque joueur présent.
router.put("/:playerProfileId/card", auth, admin, async (req, res) => {
  const {
    overallRating,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    imageUrl,
  } = req.body;

  try {
    const profile = await prisma.playerProfile.findUnique({
      where: { id: req.params.playerProfileId },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    const card = await prisma.playerCard.findFirst({
      where: { playerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    });
    if (!card) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    const updated = await prisma.playerCard.update({
      where: { id: card.id },
      data: {
        overallRating: overallRating ?? card.overallRating,
        pace: pace ?? card.pace,
        shooting: shooting ?? card.shooting,
        passing: passing ?? card.passing,
        dribbling: dribbling ?? card.dribbling,
        defending: defending ?? card.defending,
        physical: physical ?? card.physical,
        imageUrl: imageUrl ?? card.imageUrl,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Erreur PUT /players/:playerProfileId/card", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;



