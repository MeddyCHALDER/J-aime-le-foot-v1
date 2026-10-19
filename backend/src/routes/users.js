const express = require("express");
const prisma = require("../db/client");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// Mettre à jour le username de l'utilisateur connecté
router.put("/me/username", auth, async (req, res) => {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Le pseudo est requis" });
  }

  const trimmedUsername = username.trim();

  // Validation basique du username
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: "Le pseudo doit contenir au moins 3 caractères" });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: "Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores" });
  }

  try {
    // Vérifier si le username est déjà pris
    const existing = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: "Ce pseudo est déjà pris" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { username: trimmedUsername },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return res.json(user);
  } catch (err) {
    console.error("Erreur PUT /users/me/username", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer les informations de l'utilisateur connecté
router.get("/me", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Erreur GET /users/me", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Changer le rôle d'un utilisateur (Admin seulement)
// Alimente la bascule Joueur / Admin de l'écran Effectif.
router.put("/:id/role", auth, admin, async (req, res) => {
  const { role } = req.body;

  if (!["PLAYER", "COACH", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide" });
  }

  // Un admin ne peut pas se retirer ses propres droits : le club resterait
  // sans personne pour saisir les feuilles de match.
  if (req.params.id === req.user.id && role !== "ADMIN") {
    return res.status(400).json({ error: "Tu ne peux pas retirer ton propre rôle admin" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, username: true, role: true },
    });

    return res.json(user);
  } catch (err) {
    console.error("Erreur PUT /users/:id/role", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;



