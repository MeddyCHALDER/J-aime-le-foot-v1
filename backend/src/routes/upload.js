const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const auth = require("../middleware/auth");

const router = express.Router();

// S'assurer que le dossier uploads existe
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    if (!isImage && !isVideo) {
      return cb(new Error("Seules les images ou vidéos sont acceptées"));
    }
    cb(null, true);
  },
});

// Upload unique (image ou vidéo). Protégé pour connaître l'utilisateur, mais pas indispensable ici.
router.post("/", auth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.status(201).json({
    url,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

module.exports = router;


