const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const { createNotification } = require("./notifications");

const router = express.Router();

// Envoyer un message privé
router.post("/", auth, async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user.id;

  if (!receiverId || !content || !content.trim()) {
    return res.status(400).json({ error: "receiverId et content sont requis" });
  }

  if (senderId === receiverId) {
    return res.status(400).json({ error: "Vous ne pouvez pas vous envoyer un message à vous-même" });
  }

  try {
    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({ error: "Destinataire non trouvé" });
    }

    const message = await prisma.privateMessage.create({
      data: {
        senderId,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    // Créer une notification pour le destinataire
    await createNotification(
      receiverId,
      "NEW_MESSAGE",
      "Nouveau message",
      `${message.sender.username || message.sender.email} vous a envoyé un message`,
      `/messages`
    );

    return res.status(201).json(message);
  } catch (err) {
    console.error("Erreur POST /messages", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer toutes les conversations de l'utilisateur connecté
router.get("/conversations", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les conversations (utilisateurs avec qui on a échangé)
    const sentMessages = await prisma.privateMessage.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ["receiverId"],
    });

    const receivedMessages = await prisma.privateMessage.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ["senderId"],
    });

    // Combiner et dédupliquer les IDs
    const conversationUserIds = new Set();
    sentMessages.forEach((m) => conversationUserIds.add(m.receiverId));
    receivedMessages.forEach((m) => conversationUserIds.add(m.senderId));

    // Récupérer les dernières informations de chaque conversation
    const conversations = await Promise.all(
      Array.from(conversationUserIds).map(async (otherUserId) => {
        // Dernier message échangé
        const lastMessage = await prisma.privateMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
            receiver: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        });

        // Nombre de messages non lus
        const unreadCount = await prisma.privateMessage.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            read: false,
          },
        });

        return {
          userId: otherUserId,
          user: otherUserId === lastMessage.senderId ? lastMessage.sender : lastMessage.receiver,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Trier par date du dernier message (plus récent en premier)
    conversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json(conversations);
  } catch (err) {
    console.error("Erreur GET /messages/conversations", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer les messages d'une conversation avec un utilisateur spécifique
router.get("/conversations/:userId", auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    // Vérifier que l'utilisateur existe
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (!otherUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Marquer les messages reçus comme lus
    await prisma.privateMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({
      user: otherUser,
      messages,
    });
  } catch (err) {
    console.error("Erreur GET /messages/conversations/:userId", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Marquer un message comme lu
router.put("/:id/read", auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await prisma.privateMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: "Message non trouvé" });
    }

    // Vérifier que l'utilisateur est le destinataire
    if (message.receiverId !== userId) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à marquer ce message comme lu" });
    }

    const updated = await prisma.privateMessage.update({
      where: { id: messageId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Erreur PUT /messages/:id/read", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Compter les messages non lus
router.get("/unread-count", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.privateMessage.count({
      where: {
        receiverId: userId,
        read: false,
      },
    });

    res.json({ count });
  } catch (err) {
    console.error("Erreur GET /messages/unread-count", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

