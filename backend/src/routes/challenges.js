const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");

const router = express.Router();

// Liste des challenges
router.get("/", async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(challenges);
  } catch (err) {
    console.error("Erreur GET /challenges", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détail d'un challenge
router.get("/:id", async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        entries: true,
      },
    });
    if (!challenge) {
      return res.status(404).json({ error: "Challenge non trouvé" });
    }
    res.json(challenge);
  } catch (err) {
    console.error("Erreur GET /challenges/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Création d'un challenge (plus tard: restreindre aux organisateurs/admin)
router.post("/", auth, async (req, res) => {
  const { title, description, startDate, endDate } = req.body;

  if (!title) {
    return res.status(400).json({ error: "title est requis" });
  }

  try {
    const userId = req.user.id;
    const newChallenge = await prisma.challenge.create({
      data: {
        title,
        description: description || "",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(newChallenge);
  } catch (err) {
    console.error("Erreur POST /challenges", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Participation à un challenge via un post existant
router.post("/:id/entries", auth, async (req, res) => {
  const challengeId = req.params.id;
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ error: "postId est requis" });
  }

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      return res.status(404).json({ error: "Challenge non trouvé" });
    }

    const userId = req.user.id;

    const entry = await prisma.challengeEntry.create({
      data: {
        challenge: { connect: { id: challengeId } },
        post: { connect: { id: postId } },
        user: { connect: { id: userId } },
      },
    });

    return res.status(201).json(entry);
  } catch (err) {
    console.error("Erreur POST /challenges/:id/entries", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liste des participations à un challenge
router.get("/:id/entries", async (req, res) => {
  const challengeId = req.params.id;
  try {
    const entries = await prisma.challengeEntry.findMany({
      where: { challengeId },
    });
    res.json(entries);
  } catch (err) {
    console.error("Erreur GET /challenges/:id/entries", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;



