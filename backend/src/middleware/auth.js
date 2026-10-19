// Middleware d'authentification JWT
// Vérifie le token dans l'en-tête Authorization: Bearer <token>
// Le rôle est relu en base : un passage admin reste valable sans se reconnecter.

const jwt = require("jsonwebtoken");
const prisma = require("../db/client");

const { JWT_SECRET } = require("../config");

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide" });
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Token invalide ou expiré" });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    return next();
  } catch (err) {
    console.error("Erreur vérification JWT", err);
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}


