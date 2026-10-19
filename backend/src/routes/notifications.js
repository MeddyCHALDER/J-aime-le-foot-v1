const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");

const router = express.Router();

// Helper pour créer une notification
async function createNotification(userId, type, title, content, link) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content: content || null,
        link: link || null,
      },
    });
  } catch (err) {
    console.error("Erreur création notification", err);
  }
}

// Récupérer les notifications de l'utilisateur connecté
router.get("/", auth, async (req, res) => {
  try {
    const { read, limit } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (read !== undefined) {
      where.read = read === "true";
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit, 10) : 50,
    });

    res.json(notifications);
  } catch (err) {
    console.error("Erreur GET /notifications", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Compter les notifications non lues
router.get("/unread-count", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    res.json({ count });
  } catch (err) {
    console.error("Erreur GET /notifications/unread-count", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Marquer une notification comme lue
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification non trouvée" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à modifier cette notification" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Erreur PUT /notifications/:id/read", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Marquer toutes les notifications comme lues
router.put("/read-all", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({ message: "Toutes les notifications ont été marquées comme lues" });
  } catch (err) {
    console.error("Erreur PUT /notifications/read-all", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer une notification
router.delete("/:id", auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification non trouvée" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à supprimer cette notification" });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({ message: "Notification supprimée" });
  } catch (err) {
    console.error("Erreur DELETE /notifications/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Exporter la fonction helper pour l'utiliser dans d'autres routes
module.exports = router;
module.exports.createNotification = createNotification;


