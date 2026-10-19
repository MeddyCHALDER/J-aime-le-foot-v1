const express = require("express");
const prisma = require("../db/client");

const router = express.Router();

// Recherche globale (joueurs, posts, équipes)
router.get("/", async (req, res) => {
  try {
    const { q, type, limit = "20" } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Le paramètre 'q' (query) est requis" });
    }

    const searchTerm = q.trim();
    const limitNum = parseInt(limit, 10) || 20;

    const results = {
      players: [],
      posts: [],
      teams: [],
    };

    // Recherche dans les joueurs (via PlayerProfile)
    if (!type || type === "players") {
      const players = await prisma.playerProfile.findMany({
        where: {
          OR: [
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
            {
              user: {
                OR: [
                  { email: { contains: searchTerm, mode: "insensitive" } },
                  { username: { contains: searchTerm, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
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
        take: limitNum,
        orderBy: { lastName: "asc" },
      });
      results.players = players;
    }

    // Recherche dans les posts
    if (!type || type === "posts") {
      const posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        take: limitNum,
        orderBy: { createdAt: "desc" },
      });
      results.posts = posts;
    }

    // Recherche dans les équipes
    if (!type || type === "teams") {
      const teams = await prisma.team.findMany({
        where: {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
        take: limitNum,
        orderBy: { name: "asc" },
      });
      results.teams = teams;
    }

    res.json(results);
  } catch (err) {
    console.error("Erreur GET /search", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;


