const express = require("express");

const router = express.Router();

// Simple route de healthcheck
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    app: "jaime-le-foot-backend",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;


