const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db/client");

const router = express.Router();

const { jwtSecret: JWT_SECRET } = require("../config");

// Helper pour générer un token JWT
function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Inscription avec Prisma
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email et password sont requis" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Un utilisateur avec cet email existe déjà" });
    }

    // Vérifier si le username est déjà pris (si fourni)
    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ error: "Ce pseudo est déjà pris" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username: username || null,
        passwordHash,
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Erreur /auth/register", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Connexion avec vérification du hash
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email et password sont requis" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Erreur /auth/login", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;



