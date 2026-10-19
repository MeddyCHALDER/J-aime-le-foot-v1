const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Lister toutes les équipes
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        members: {
          include: {
            playerProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(teams);
  } catch (err) {
    console.error("Erreur GET /teams", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détails d'une équipe
router.get("/:id", async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            playerProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                  },
                },
                cards: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        tournamentTeams: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                type: true,
                season: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            homeMatches: true,
            awayMatches: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Équipe non trouvée" });
    }

    res.json(team);
  } catch (err) {
    console.error("Erreur GET /teams/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer une équipe (admin). Si l'admin a une fiche, il y est rattaché.
router.post("/", auth, admin, async (req, res) => {
  const { name, logoUrl } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Le nom de l'équipe est requis" });
  }

  try {
    const existing = await prisma.team.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Une équipe avec ce nom existe déjà" });
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl || null,
        ...(profile
          ? { members: { create: { playerProfileId: profile.id } } }
          : {}),
      },
      include: {
        members: {
          include: {
            playerProfile: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return res.status(201).json(team);
  } catch (err) {
    console.error("Erreur POST /teams", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour une équipe (auth requise - seulement le créateur ou admin)
router.put("/:id", auth, async (req, res) => {
  const { name, logoUrl } = req.body;
  const teamId = req.params.id;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: "Équipe non trouvée" });
    }

    // Vérifier si le nom est déjà pris (si modifié)
    if (name && name.trim() !== team.name) {
      const existing = await prisma.team.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: "insensitive",
          },
          NOT: {
            id: teamId,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: "Une équipe avec ce nom existe déjà" });
      }
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: name ? name.trim() : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Erreur PUT /teams/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajouter un membre à une équipe (auth requise)
router.post("/:id/members", auth, async (req, res) => {
  const teamId = req.params.id;
  const { playerProfileId } = req.body;

  if (!playerProfileId) {
    return res.status(400).json({ error: "playerProfileId est requis" });
  }

  try {
    // Vérifier que l'équipe existe
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: "Équipe non trouvée" });
    }

    // Vérifier que le profil joueur existe
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    if (!playerProfile) {
      return res.status(404).json({ error: "Profil joueur non trouvé" });
    }

    // Vérifier si le joueur est déjà dans l'équipe
    const existing = await prisma.teamMember.findFirst({
      where: {
        teamId,
        playerProfileId,
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Ce joueur est déjà dans cette équipe" });
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        playerProfileId,
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

    return res.status(201).json(member);
  } catch (err) {
    console.error("Erreur POST /teams/:id/members", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Retirer un membre d'une équipe (auth requise)
router.delete("/:id/members/:memberId", auth, async (req, res) => {
  const teamId = req.params.id;
  const memberId = req.params.memberId;

  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        playerProfile: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: "Membre non trouvé" });
    }

    if (member.teamId !== teamId) {
      return res.status(400).json({ error: "Ce membre n'appartient pas à cette équipe" });
    }

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    return res.json({ message: "Membre retiré de l'équipe" });
  } catch (err) {
    console.error("Erreur DELETE /teams/:id/members/:memberId", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mes équipes (équipes où l'utilisateur connecté est membre)
router.get("/me/teams", auth, async (req, res) => {
  try {
    // Récupérer le profil joueur de l'utilisateur
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!playerProfile) {
      return res.json([]);
    }

    const teamMemberships = await prisma.teamMember.findMany({
      where: {
        playerProfileId: playerProfile.id,
      },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const teams = teamMemberships.map((tm) => tm.team);

    res.json(teams);
  } catch (err) {
    console.error("Erreur GET /teams/me/teams", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;


