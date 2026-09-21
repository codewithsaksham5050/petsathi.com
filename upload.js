const fs = require("fs");
const path = require("path");
const multer = require("multer");

const PETS_DIR = path.join(__dirname, "..", "uploads", "pets");
const PROFILES_DIR = path.join(__dirname, "..", "uploads", "profiles");
[PETS_DIR, PROFILES_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function makeStorage(dir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    },
  });
}

function imageFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  if (ok) cb(null, true);
  else cb(new Error("Only image files are allowed (jpg, png, webp, gif)"));
}

const uploadPetImages = multer({
  storage: makeStorage(PETS_DIR),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

const uploadProfileImage = multer({
  storage: makeStorage(PROFILES_DIR),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadPetImages, uploadProfileImage };
