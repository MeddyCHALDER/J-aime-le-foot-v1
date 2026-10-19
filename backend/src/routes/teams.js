const crypto = require("crypto");
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

// ---------------------------------------------------------------------------
// Invitations : l'admin fabrique un lien, l'envoie à ses joueurs, et l'ouvrir
// rattache au club à la fin de l'onboarding.
// ---------------------------------------------------------------------------

// Lien d'invitation courant de l'équipe (admin).
router.get("/:id/invite", auth, admin, async (req, res) => {
  try {
    const invite = await prisma.teamInvite.findFirst({
      where: { teamId: req.params.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!invite) return res.json(null);
    return res.json(invite);
  } catch (err) {
    console.error("Erreur GET /teams/:id/invite", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Crée un lien, ou le régénère : l'ancien est révoqué dans la foulée, ce qui
// coupe l'accès à quiconque l'avait déjà reçu.
router.post("/:id/invite", auth, admin, async (req, res) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) return res.status(404).json({ error: "Équipe non trouvée" });

    await prisma.teamInvite.updateMany({
      where: { teamId: team.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 32 octets d'aléa : impossible à deviner, contrairement à un uuid v4
    // qu'on pourrait confondre avec un identifiant public.
    const token = crypto.randomBytes(32).toString("base64url");

    // Trois mois : assez pour une saison de recrutement, pas éternel.
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const invite = await prisma.teamInvite.create({
      data: { token, teamId: team.id, createdById: req.user.id, expiresAt },
    });
    return res.status(201).json(invite);
  } catch (err) {
    console.error("Erreur POST /teams/:id/invite", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Consultation publique : le joueur doit voir quel club l'invite avant de
// créer son compte. On ne renvoie que le nom de l'équipe.
router.get("/invites/:token", async (req, res) => {
  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { token: req.params.token },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
    });

    if (!invite || invite.revokedAt) {
      return res.status(404).json({ error: "Cette invitation n'est plus valable" });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: "Cette invitation a expiré" });
    }

    return res.json({ team: invite.team });
  } catch (err) {
    console.error("Erreur GET /teams/invites/:token", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Accepter l'invitation : rattache le joueur connecté à l'équipe.
router.post("/invites/:token/accept", auth, async (req, res) => {
  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { token: req.params.token },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!invite || invite.revokedAt) {
      return res.status(404).json({ error: "Cette invitation n'est plus valable" });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: "Cette invitation a expiré" });
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      return res
        .status(400)
        .json({ error: "Crée ta fiche joueur avant de rejoindre le club" });
    }

    const existing = await prisma.teamMember.findFirst({
      where: { teamId: invite.teamId, playerProfileId: profile.id },
    });
    // Déjà membre : on répond comme si ça venait de marcher, pour que rouvrir
    // le lien ne ressemble pas à une erreur.
    if (existing) return res.json({ team: invite.team, alreadyMember: true });

    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: invite.teamId, playerProfileId: profile.id },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return res.status(201).json({ team: invite.team, alreadyMember: false });
  } catch (err) {
    console.error("Erreur POST /teams/invites/:token/accept", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;


