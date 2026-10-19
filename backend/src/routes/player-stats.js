const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Ajouter/mettre à jour les stats d'un joueur pour un match (Admin uniquement)
router.post("/", auth, admin, async (req, res) => {
  const { matchId, playerProfileId, tournamentId, goals, assists, yellowCards, redCards, minutesPlayed, matchResult } = req.body;

  if (!matchId || !playerProfileId || !tournamentId) {
    return res.status(400).json({ error: "matchId, playerProfileId et tournamentId sont requis" });
  }

  try {
    // Vérifier que le match existe et appartient au tournoi
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match || match.tournamentId !== tournamentId) {
      return res.status(404).json({ error: "Match non trouvé ou n'appartient pas au tournoi" });
    }

    // Créer ou mettre à jour les stats
    const stats = await prisma.playerMatchStat.upsert({
      where: {
        matchId_playerProfileId: {
          matchId,
          playerProfileId,
        },
      },
      update: {
        goals: goals ?? 0,
        assists: assists ?? 0,
        yellowCards: yellowCards ?? 0,
        redCards: redCards ?? 0,
        minutesPlayed: minutesPlayed ?? null,
        matchResult: matchResult || null, // WIN, DRAW, LOSS
      },
      create: {
        matchId,
        playerProfileId,
        tournamentId,
        goals: goals ?? 0,
        assists: assists ?? 0,
        yellowCards: yellowCards ?? 0,
        redCards: redCards ?? 0,
        minutesPlayed: minutesPlayed ?? null,
        matchResult: matchResult || null,
      },
    });

    return res.status(201).json(stats);
  } catch (err) {
    console.error("Erreur POST /player-stats", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer les stats d'un joueur pour un match
router.get("/match/:matchId/player/:playerProfileId", async (req, res) => {
  try {
    const stats = await prisma.playerMatchStat.findUnique({
      where: {
        matchId_playerProfileId: {
          matchId: req.params.matchId,
          playerProfileId: req.params.playerProfileId,
        },
      },
      include: {
        playerProfile: true,
        match: true,
      },
    });

    if (!stats) {
      return res.status(404).json({ error: "Stats non trouvées" });
    }

    res.json(stats);
  } catch (err) {
    console.error("Erreur GET /player-stats/match/:matchId/player/:playerProfileId", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer toutes les stats d'un joueur pour un tournoi
router.get("/tournament/:tournamentId/player/:playerProfileId", async (req, res) => {
  try {
    const stats = await prisma.playerMatchStat.findMany({
      where: {
        tournamentId: req.params.tournamentId,
        playerProfileId: req.params.playerProfileId,
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: {
        match: {
          matchDate: "asc",
        },
      },
    });

    res.json(stats);
  } catch (err) {
    console.error("Erreur GET /player-stats/tournament/:tournamentId/player/:playerProfileId", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer toutes les stats d'un match
router.get("/match/:matchId", async (req, res) => {
  try {
    const stats = await prisma.playerMatchStat.findMany({
      where: {
        matchId: req.params.matchId,
      },
      include: {
        playerProfile: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    res.json(stats);
  } catch (err) {
    console.error("Erreur GET /player-stats/match/:matchId", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

