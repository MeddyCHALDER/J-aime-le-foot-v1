const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Lister les matchs intra-club d'une équipe
router.get("/team/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status, upcoming } = req.query;

    const where = { teamId };
    if (status) {
      where.status = status;
    }
    if (upcoming === "true") {
      where.matchDate = { gte: new Date() };
    }

    const matches = await prisma.clubMatch.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            stats: true,
          },
        },
      },
      orderBy: { matchDate: "desc" },
    });

    res.json(matches);
  } catch (err) {
    console.error("Erreur GET /club-matches/team/:teamId", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détails d'un match intra-club
router.get("/:id", async (req, res) => {
  try {
    const match = await prisma.clubMatch.findUnique({
      where: { id: req.params.id },
      include: {
        team: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        registrations: {
          include: {
            playerProfile: {
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
            },
          },
          orderBy: { registeredAt: "asc" },
        },
        stats: {
          include: {
            playerProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                  },
                },
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!match) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    res.json(match);
  } catch (err) {
    console.error("Erreur GET /club-matches/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un match intra-club (Admin seulement)
router.post("/", auth, admin, async (req, res) => {
  const { teamId, matchDate, round, tournamentId, maxPlayers } = req.body;

  if (!teamId || !matchDate) {
    return res.status(400).json({ error: "teamId et matchDate sont requis" });
  }

  try {
    // Vérifier que l'équipe existe
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: "Équipe non trouvée" });
    }

    // Vérifier le championnat si fourni
    if (tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!tournament) {
        return res.status(404).json({ error: "Championnat non trouvé" });
      }
    }

    const match = await prisma.clubMatch.create({
      data: {
        teamId,
        tournamentId: tournamentId || null,
        matchDate: new Date(matchDate),
        round: round ? parseInt(round, 10) : null,
        maxPlayers: maxPlayers ? parseInt(maxPlayers, 10) : 40,
        createdById: req.user.id,
        status: "OPEN",
      },
      include: {
        team: true,
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json(match);
  } catch (err) {
    console.error("Erreur POST /club-matches", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour un match (Admin seulement)
router.put("/:id", auth, admin, async (req, res) => {
  const { matchDate, round, status, maxPlayers } = req.body;

  try {
    const match = await prisma.clubMatch.findUnique({
      where: { id: req.params.id },
    });

    if (!match) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    const updated = await prisma.clubMatch.update({
      where: { id: req.params.id },
      data: {
        matchDate: matchDate ? new Date(matchDate) : undefined,
        round: round !== undefined ? parseInt(round, 10) : undefined,
        status: status || undefined,
        maxPlayers: maxPlayers !== undefined ? parseInt(maxPlayers, 10) : undefined,
      },
      include: {
        team: true,
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Erreur PUT /club-matches/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// S'inscrire à un match
router.post("/:id/register", auth, async (req, res) => {
  const matchId = req.params.id;
  const userId = req.user.id;

  try {
    // Vérifier que le match existe
    const match = await prisma.clubMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    if (match.status !== "OPEN") {
      return res.status(400).json({ error: "Les inscriptions sont fermées pour ce match" });
    }

    // Vérifier que l'utilisateur a un profil joueur
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!playerProfile) {
      return res.status(400).json({ error: "Vous devez avoir un profil joueur pour vous inscrire" });
    }

    // Vérifier que le joueur est membre de l'équipe
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: match.teamId,
        playerProfileId: playerProfile.id,
      },
    });

    if (!teamMember) {
      return res.status(403).json({ error: "Vous devez être membre de l'équipe pour vous inscrire" });
    }

    // Vérifier la limite de joueurs
    if (match.maxPlayers) {
      const registrationCount = await prisma.clubMatchRegistration.count({
        where: { clubMatchId: matchId },
      });
      if (registrationCount >= match.maxPlayers) {
        return res.status(400).json({ error: "Le nombre maximum de joueurs est atteint" });
      }
    }

    // Vérifier si déjà inscrit
    const existing = await prisma.clubMatchRegistration.findUnique({
      where: {
        clubMatchId_playerProfileId: {
          clubMatchId: matchId,
          playerProfileId: playerProfile.id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Vous êtes déjà inscrit à ce match" });
    }

    const registration = await prisma.clubMatchRegistration.create({
      data: {
        clubMatchId: matchId,
        playerProfileId: playerProfile.id,
        userId,
      },
      include: {
        playerProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json(registration);
  } catch (err) {
    console.error("Erreur POST /club-matches/:id/register", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Se désinscrire d'un match
router.delete("/:id/register", auth, async (req, res) => {
  const matchId = req.params.id;
  const userId = req.user.id;

  try {
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!playerProfile) {
      return res.status(400).json({ error: "Profil joueur non trouvé" });
    }

    const registration = await prisma.clubMatchRegistration.findUnique({
      where: {
        clubMatchId_playerProfileId: {
          clubMatchId: matchId,
          playerProfileId: playerProfile.id,
        },
      },
    });

    if (!registration) {
      return res.status(404).json({ error: "Vous n'êtes pas inscrit à ce match" });
    }

    await prisma.clubMatchRegistration.delete({
      where: { id: registration.id },
    });

    return res.json({ message: "Inscription annulée" });
  } catch (err) {
    console.error("Erreur DELETE /club-matches/:id/register", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajouter/mettre à jour les stats d'un joueur pour un match (Admin seulement)
router.post("/:id/stats", auth, admin, async (req, res) => {
  const matchId = req.params.id;
  const { playerProfileId, teamId, goals, assists, yellowCards, redCards, minutesPlayed, matchResult } = req.body;

  if (!playerProfileId) {
    return res.status(400).json({ error: "playerProfileId est requis" });
  }

  try {
    // Vérifier que le match existe
    const match = await prisma.clubMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    // Vérifier que le joueur est inscrit
    const registration = await prisma.clubMatchRegistration.findUnique({
      where: {
        clubMatchId_playerProfileId: {
          clubMatchId: matchId,
          playerProfileId,
        },
      },
    });

    if (!registration) {
      return res.status(400).json({ error: "Ce joueur n'est pas inscrit à ce match" });
    }

    // Créer ou mettre à jour les stats
    const stats = await prisma.clubMatchStat.upsert({
      where: {
        clubMatchId_playerProfileId: {
          clubMatchId: matchId,
          playerProfileId,
        },
      },
      update: {
        teamId: teamId || undefined,
        goals: goals !== undefined ? parseInt(goals, 10) : undefined,
        assists: assists !== undefined ? parseInt(assists, 10) : undefined,
        yellowCards: yellowCards !== undefined ? parseInt(yellowCards, 10) : undefined,
        redCards: redCards !== undefined ? parseInt(redCards, 10) : undefined,
        minutesPlayed: minutesPlayed !== undefined ? parseInt(minutesPlayed, 10) : undefined,
        matchResult: matchResult || undefined,
      },
      create: {
        clubMatchId: matchId,
        playerProfileId,
        teamId: teamId || null,
        goals: goals ? parseInt(goals, 10) : 0,
        assists: assists ? parseInt(assists, 10) : 0,
        yellowCards: yellowCards ? parseInt(yellowCards, 10) : 0,
        redCards: redCards ? parseInt(redCards, 10) : 0,
        minutesPlayed: minutesPlayed ? parseInt(minutesPlayed, 10) : null,
        matchResult: matchResult || null,
      },
      include: {
        playerProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json(stats);
  } catch (err) {
    console.error("Erreur POST /club-matches/:id/stats", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mes matchs (matchs où l'utilisateur est inscrit)
router.get("/me/matches", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const playerProfile = await prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!playerProfile) {
      return res.json([]);
    }

    const registrations = await prisma.clubMatchRegistration.findMany({
      where: {
        playerProfileId: playerProfile.id,
      },
      include: {
        clubMatch: {
          include: {
            team: true,
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                registrations: true,
              },
            },
          },
        },
      },
      orderBy: {
        clubMatch: {
          matchDate: "desc",
        },
      },
    });

    const matches = registrations.map((r) => r.clubMatch);

    res.json(matches);
  } catch (err) {
    console.error("Erreur GET /club-matches/me/matches", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;


