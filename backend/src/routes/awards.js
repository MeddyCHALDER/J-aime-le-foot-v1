const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Liste de tous les prix
router.get("/", async (req, res) => {
  try {
    const awards = await prisma.award.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tournament: {
          select: { id: true, name: true },
        },
        nominations: {
          include: {
            playerProfile: {
              include: {
                user: {
                  select: { email: true },
                },
              },
            },
            post: {
              select: { id: true, title: true, videoUrl: true, thumbnailUrl: true },
            },
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });
    res.json(awards);
  } catch (err) {
    console.error("Erreur GET /awards", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détail d'un prix avec résultats
router.get("/:id", async (req, res) => {
  try {
    const award = await prisma.award.findUnique({
      where: { id: req.params.id },
      include: {
        tournament: {
          select: { id: true, name: true },
        },
        nominations: {
          include: {
            playerProfile: {
              include: {
                user: {
                  select: { email: true },
                },
              },
            },
            post: {
              select: { id: true, title: true, videoUrl: true, thumbnailUrl: true },
            },
            votes: {
              include: {
                user: {
                  select: { email: true },
                },
              },
            },
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    if (!award) {
      return res.status(404).json({ error: "Prix non trouvé" });
    }

    // Calculer le nombre de votes par nomination et trier
    const nominationsWithVoteCount = award.nominations
      .map((nom) => ({
        ...nom,
        voteCount: nom._count?.votes || nom.votes.length,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    res.json({
      ...award,
      nominations: nominationsWithVoteCount,
    });
  } catch (err) {
    console.error("Erreur GET /awards/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un prix (Admin uniquement)
router.post("/", auth, admin, async (req, res) => {
  const { type, name, season, tournamentId } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: "type et name sont requis" });
  }

  try {
    const award = await prisma.award.create({
      data: {
        type,
        name,
        season: season || null,
        tournamentId: tournamentId || null,
      },
      include: {
        tournament: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json(award);
  } catch (err) {
    console.error("Erreur POST /awards", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Nommer un joueur/post pour un prix (Admin uniquement)
router.post("/:id/nominations", auth, admin, async (req, res) => {
  const { playerProfileId, postId } = req.body;

  if (!playerProfileId) {
    return res.status(400).json({ error: "playerProfileId est requis" });
  }

  try {
    const award = await prisma.award.findUnique({
      where: { id: req.params.id },
    });

    if (!award) {
      return res.status(404).json({ error: "Prix non trouvé" });
    }

    // Vérifier si le joueur est déjà nominé pour ce prix
    const existing = await prisma.awardNomination.findFirst({
      where: {
        awardId: req.params.id,
        playerProfileId,
        postId: postId || null,
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Cette nomination existe déjà" });
    }

    const nomination = await prisma.awardNomination.create({
      data: {
        awardId: req.params.id,
        playerProfileId,
        postId: postId || null,
      },
      include: {
        playerProfile: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        post: {
          select: { id: true, title: true, videoUrl: true },
        },
      },
    });

    return res.status(201).json(nomination);
  } catch (err) {
    console.error("Erreur POST /awards/:id/nominations", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Voter pour une nomination
router.post("/:id/vote", auth, async (req, res) => {
  const { nominationId } = req.body;

  if (!nominationId) {
    return res.status(400).json({ error: "nominationId est requis" });
  }

  try {
    const award = await prisma.award.findUnique({
      where: { id: req.params.id },
    });

    if (!award) {
      return res.status(404).json({ error: "Prix non trouvé" });
    }

    // Vérifier si l'utilisateur a déjà voté pour ce prix
    const existingVote = await prisma.awardVote.findUnique({
      where: {
        awardId_userId: {
          awardId: req.params.id,
          userId: req.user.id,
        },
      },
    });

    if (existingVote) {
      // Mettre à jour le vote existant
      const updatedVote = await prisma.awardVote.update({
        where: { id: existingVote.id },
        data: {
          nominationId,
        },
        include: {
          nomination: {
            include: {
              playerProfile: true,
            },
          },
        },
      });
      return res.json(updatedVote);
    }

    // Créer un nouveau vote
    const vote = await prisma.awardVote.create({
      data: {
        awardId: req.params.id,
        userId: req.user.id,
        nominationId,
      },
      include: {
        nomination: {
          include: {
            playerProfile: true,
          },
        },
      },
    });

    return res.status(201).json(vote);
  } catch (err) {
    console.error("Erreur POST /awards/:id/vote", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Vérifier si l'utilisateur a déjà voté pour un prix
router.get("/:id/my-vote", auth, async (req, res) => {
  try {
    const vote = await prisma.awardVote.findUnique({
      where: {
        awardId_userId: {
          awardId: req.params.id,
          userId: req.user.id,
        },
      },
      include: {
        nomination: {
          include: {
            playerProfile: true,
            post: {
              select: { id: true, title: true, videoUrl: true },
            },
          },
        },
      },
    });

    if (!vote) {
      return res.json({ hasVoted: false });
    }

    return res.json({ hasVoted: true, vote });
  } catch (err) {
    console.error("Erreur GET /awards/:id/my-vote", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

