// Middleware pour vérifier que l'utilisateur est admin
// À utiliser après authMiddleware

module.exports = function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès réservé aux administrateurs" });
  }

  return next();
};



