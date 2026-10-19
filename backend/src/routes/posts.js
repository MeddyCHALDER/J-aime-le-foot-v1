const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const { createNotification } = require("./notifications");

const router = express.Router();

// Liste des posts avec filtres et pagination
router.get("/", async (req, res) => {
  try {
    const { userId, search, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (userId) {
      where.userId = userId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              // Le feed affiche le nom du joueur, pas son pseudo.
              playerProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
            },
          },
          likes: {
            include: {
              user: {
                select: { id: true, email: true, username: true },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: { id: true, email: true, username: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Erreur GET /posts", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Création d'un post vidéo simple
router.post("/", auth, async (req, res) => {
  const { title, description, videoUrl } = req.body;

  if (!title || !videoUrl) {
    return res
      .status(400)
      .json({ error: "title et videoUrl sont requis pour créer un post" });
  }

  try {
    const userId = req.user.id;

    const post = await prisma.post.create({
      data: {
        title,
        description: description || "",
        videoUrl,
        type: "VIDEO",
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(post);
  } catch (err) {
    console.error("Erreur POST /posts", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détail d'un post avec likes et commentaires
router.get("/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            // Le feed affiche le nom du joueur, pas son pseudo.
            playerProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        likes: {
          include: {
            user: {
              select: { id: true, email: true, username: true },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, email: true, username: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    res.json(post);
  } catch (err) {
    console.error("Erreur GET /posts/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liker/unliker un post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId: req.params.id,
          userId: req.user.id,
        },
      },
    });

    if (existingLike) {
      // Unliker
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      return res.json({ liked: false });
    } else {
      // Liker
      await prisma.postLike.create({
        data: {
          postId: req.params.id,
          userId: req.user.id,
        },
      });

      // Créer une notification pour le propriétaire du post (si ce n'est pas lui-même)
      if (post.userId !== req.user.id) {
        await createNotification(
          post.userId,
          "POST_LIKE",
          "Nouveau like sur votre post",
          `${req.user.email} a aimé votre post "${post.title}"`,
          `/posts/${post.id}`
        );
      }

      return res.json({ liked: true });
    }
  } catch (err) {
    console.error("Erreur POST /posts/:id/like", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajouter un commentaire
router.post("/:id/comments", auth, async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Le contenu du commentaire est requis" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    const comment = await prisma.postComment.create({
      data: {
        postId: req.params.id,
        userId: req.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, email: true, username: true },
        },
      },
    });

    // Créer une notification pour le propriétaire du post (si ce n'est pas lui-même)
    if (post.userId !== req.user.id) {
      await createNotification(
        post.userId,
        "POST_COMMENT",
        "Nouveau commentaire sur votre post",
        `${comment.user.username || comment.user.email} a commenté votre post "${post.title}"`,
        `/posts/${req.params.id}`
      );
    }

    return res.status(201).json(comment);
  } catch (err) {
    console.error("Erreur POST /posts/:id/comments", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un commentaire (seul l'auteur peut supprimer)
router.delete("/comments/:id", auth, async (req, res) => {
  try {
    const comment = await prisma.postComment.findUnique({
      where: { id: req.params.id },
    });

    if (!comment) {
      return res.status(404).json({ error: "Commentaire non trouvé" });
    }

    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: "Tu ne peux supprimer que tes propres commentaires" });
    }

    await prisma.postComment.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: "Commentaire supprimé" });
  } catch (err) {
    console.error("Erreur DELETE /posts/comments/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;



