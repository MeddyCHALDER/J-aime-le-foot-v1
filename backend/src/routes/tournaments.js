const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Liste des tournois
router.get("/", async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true },
        },
        teams: {
          include: {
            team: true,
          },
        },
      },
    });
    res.json(tournaments);
  } catch (err) {
    console.error("Erreur GET /tournaments", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détail d'un tournoi
router.get("/:id", async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, email: true },
        },
        teams: {
          include: {
            team: true,
          },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: [
            { round: "asc" },
            { matchDate: "asc" },
          ],
        },
      },
    });
    if (!tournament) {
      return res.status(404).json({ error: "Tournoi non trouvé" });
    }
    res.json(tournament);
  } catch (err) {
    console.error("Erreur GET /tournaments/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Création d'un tournoi (auth requise)
// Seuls les admins peuvent créer des championnats (LEAGUE)
// Les users peuvent créer des tournois (CUP)
router.post("/", auth, async (req, res) => {
  const { name, type, season } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name est requis" });
  }

  const tournamentType = type || "CUP";

  // Vérifier les permissions
  if (tournamentType === "LEAGUE" && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Seuls les administrateurs peuvent créer des championnats" });
  }

  try {
    const userId = req.user.id;

    const tournament = await prisma.tournament.create({
      data: {
        name,
        type: tournamentType,
        season: season || null,
        createdBy: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(tournament);
  } catch (err) {
    console.error("Erreur POST /tournaments", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer une équipe
router.post("/teams", auth, async (req, res) => {
  const { name, logoUrl } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name est requis" });
  }

  try {
    const team = await prisma.team.create({
      data: {
        name,
        logoUrl: logoUrl || null,
      },
    });

    return res.status(201).json(team);
  } catch (err) {
    console.error("Erreur POST /tournaments/teams", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Lister les équipes
router.get("/teams/all", async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
    });
    res.json(teams);
  } catch (err) {
    console.error("Erreur GET /tournaments/teams/all", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajouter une équipe à un tournoi
router.post("/:id/teams", auth, async (req, res) => {
  const tournamentId = req.params.id;
  const { teamId } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: "teamId est requis" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return res.status(404).json({ error: "Tournoi non trouvé" });
    }

    const tournamentTeam = await prisma.tournamentTeam.create({
      data: {
        tournament: { connect: { id: tournamentId } },
        team: { connect: { id: teamId } },
      },
    });

    return res.status(201).json(tournamentTeam);
  } catch (err) {
    console.error("Erreur POST /tournaments/:id/teams", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un match
router.post("/:id/matches", auth, async (req, res) => {
  const tournamentId = req.params.id;
  const { homeTeamId, awayTeamId, matchDate, round } = req.body;

  if (!homeTeamId || !awayTeamId || !matchDate) {
    return res.status(400).json({ error: "homeTeamId, awayTeamId et matchDate sont requis" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return res.status(404).json({ error: "Tournoi non trouvé" });
    }

    const match = await prisma.match.create({
      data: {
        tournament: { connect: { id: tournamentId } },
        homeTeam: { connect: { id: homeTeamId } },
        awayTeam: { connect: { id: awayTeamId } },
        matchDate: new Date(matchDate),
        round: round ? parseInt(round, 10) : null,
      },
    });

    return res.status(201).json(match);
  } catch (err) {
    console.error("Erreur POST /tournaments/:id/matches", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour le résultat d'un match
router.put("/matches/:id/result", auth, async (req, res) => {
  const matchId = req.params.id;
  const { homeScore, awayScore } = req.body;

  if (homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: "homeScore et awayScore sont requis" });
  }

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: parseInt(homeScore, 10),
        awayScore: parseInt(awayScore, 10),
      },
    });

    return res.json(updatedMatch);
  } catch (err) {
    console.error("Erreur PUT /tournaments/matches/:id/result", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Générer automatiquement les journées d'un championnat (round-robin) - Admin uniquement
router.post("/:id/generate-rounds", auth, admin, async (req, res) => {
  const tournamentId = req.params.id;
  const { startDate, daysBetweenRounds = 7 } = req.body;

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournoi non trouvé" });
    }

    if (tournament.type !== "LEAGUE") {
      return res.status(400).json({ error: "La génération automatique n'est disponible que pour les championnats" });
    }

    const teams = tournament.teams.map((tt) => tt.team);
    if (teams.length < 2) {
      return res.status(400).json({ error: "Il faut au moins 2 équipes pour générer les journées" });
    }

    // Algorithme round-robin (chacun joue contre chacun)
    const matches = [];
    const numTeams = teams.length;
    const numRounds = numTeams % 2 === 0 ? numTeams - 1 : numTeams;
    const baseDate = startDate ? new Date(startDate) : new Date();

    // Si nombre impair d'équipes, on ajoute une équipe "bye" virtuelle
    const teamList = [...teams];
    if (numTeams % 2 === 1) {
      teamList.push(null); // Équipe bye
    }

    // Créer les paires de matchs pour chaque journée
    for (let round = 1; round <= numRounds; round++) {
      const roundDate = new Date(baseDate);
      roundDate.setDate(roundDate.getDate() + (round - 1) * (daysBetweenRounds || 7));

      for (let i = 0; i < Math.floor(teamList.length / 2); i++) {
        const homeIdx = (round - 1 + i) % (teamList.length - 1);
        const awayIdx = (teamList.length - 1 - i + round - 1) % (teamList.length - 1);

        const homeTeam = teamList[homeIdx >= teamList.length - 1 ? teamList.length - 1 : homeIdx];
        const awayTeam = teamList[awayIdx >= teamList.length - 1 ? teamList.length - 1 : awayIdx];

        // Ignorer si une équipe est bye (null)
        if (homeTeam && awayTeam) {
          matches.push({
            tournamentId,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            matchDate: new Date(roundDate),
            round,
          });
        }
      }
    }

    // Créer tous les matchs en base
    const createdMatches = await prisma.match.createMany({
      data: matches,
    });

    return res.status(201).json({
      message: `${createdMatches.count} matchs créés pour ${numRounds} journées`,
      rounds: numRounds,
      matchesCreated: createdMatches.count,
    });
  } catch (err) {
    console.error("Erreur POST /tournaments/:id/generate-rounds", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Classement des joueurs dans un championnat (par points : 3/1/0)
router.get("/:id/player-ranking", async (req, res) => {
  try {
    const { sortBy = "points" } = req.query; // points, goals, assists

    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournoi non trouvé" });
    }

    if (tournament.type !== "LEAGUE") {
      return res.status(400).json({ error: "Le classement par joueur n'est disponible que pour les championnats" });
    }

    // Récupérer toutes les stats des joueurs pour ce championnat
    const stats = await prisma.playerMatchStat.findMany({
      where: { tournamentId: req.params.id },
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

    // Agréger les stats par joueur
    const playerStatsMap = {};
    stats.forEach((stat) => {
      const playerId = stat.playerProfileId;
      if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
          playerProfile: stat.playerProfile,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0, // 3 pts victoire, 1 pt nul, 0 pt défaite
        };
      }
      playerStatsMap[playerId].goals += stat.goals;
      playerStatsMap[playerId].assists += stat.assists;
      playerStatsMap[playerId].yellowCards += stat.yellowCards;
      playerStatsMap[playerId].redCards += stat.redCards;
      playerStatsMap[playerId].matchesPlayed += 1;

      // Calculer les points selon le résultat du match
      if (stat.matchResult === "WIN") {
        playerStatsMap[playerId].wins += 1;
        playerStatsMap[playerId].points += 3;
      } else if (stat.matchResult === "DRAW") {
        playerStatsMap[playerId].draws += 1;
        playerStatsMap[playerId].points += 1;
      } else if (stat.matchResult === "LOSS") {
        playerStatsMap[playerId].losses += 1;
      }
    });

    // Convertir en tableau et trier selon le critère
    let ranking = Object.values(playerStatsMap).map((p) => ({
      player: {
        id: p.playerProfile.id,
        firstName: p.playerProfile.firstName,
        lastName: p.playerProfile.lastName,
        position: p.playerProfile.position,
        email: p.playerProfile.user.email,
      },
      goals: p.goals,
      assists: p.assists,
      yellowCards: p.yellowCards,
      redCards: p.redCards,
      matchesPlayed: p.matchesPlayed,
      wins: p.wins,
      draws: p.draws,
      losses: p.losses,
      points: p.points,
    }));

    // Trier selon le critère choisi
    if (sortBy === "goals") {
      ranking.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.assists - a.assists;
      });
    } else if (sortBy === "assists") {
      ranking.sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.goals - a.goals;
      });
    } else {
      // Par défaut : classement par points
      ranking.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.assists - a.assists;
      });
    }

    res.json({ ranking, sortBy });
  } catch (err) {
    console.error("Erreur GET /tournaments/:id/player-ranking", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

