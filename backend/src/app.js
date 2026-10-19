// Configuration principale de l'application Express

const express = require("express");
const cors = require("cors");
const path = require("path");
const { corsOrigin } = require("./config");

const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const postsRouter = require("./routes/posts");
const challengesRouter = require("./routes/challenges");
const playersRouter = require("./routes/players");
const uploadRouter = require("./routes/upload");
const tournamentsRouter = require("./routes/tournaments");
const championshipsRouter = require("./routes/championships");
const playerStatsRouter = require("./routes/player-stats");
const awardsRouter = require("./routes/awards");
const usersRouter = require("./routes/users");
const teamsRouter = require("./routes/teams");
const messagesRouter = require("./routes/messages");
const notificationsRouter = require("./routes/notifications");
const searchRouter = require("./routes/search");
const clubMatchesRouter = require("./routes/club-matches");

const app = express();

// Middlewares globaux
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Préfixe API v1
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/posts", postsRouter);
app.use("/api/v1/challenges", challengesRouter);
app.use("/api/v1/players", playersRouter);
app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/tournaments", tournamentsRouter);
app.use("/api/v1/championships", championshipsRouter);
app.use("/api/v1/player-stats", playerStatsRouter);
app.use("/api/v1/awards", awardsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/teams", teamsRouter);
app.use("/api/v1/messages", messagesRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/club-matches", clubMatchesRouter);

// Servir les fichiers uploadés
// multer écrit dans src/uploads (routes/upload.js) : on sert ce dossier-là.
// Avec "..", on servait backend/uploads, qui n'existe pas — toutes les
// photos et vidéos renvoyaient 404.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

module.exports = app;


