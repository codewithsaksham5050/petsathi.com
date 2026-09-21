const express = require("express");
const excelDB = require("../utils/excelDB");
const { USERS } = require("../utils/tables");
const { verifyToken } = require("../middleware/auth");
const { uploadProfileImage } = require("../middleware/upload");

const router = express.Router();

function publicUser(u) {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}

// GET /api/users/me
router.get("/me", verifyToken, async (req, res) => {
  const users = await excelDB.readAll(USERS.file, USERS.sheet, USERS.headers);
  const user = users.find((u) => Number(u.id) === Number(req.user.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(publicUser(user));
});

// PUT /api/users/me  (multipart/form-data, field: profileImage)
router.put("/me", verifyToken, uploadProfileImage.single("profileImage"), async (req, res) => {
  try {
    const { name, phone, address, bio } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (bio !== undefined) updates.bio = bio;
    if (req.file) updates.profileImage = `/uploads/profiles/${req.file.filename}`;

    const updated = await excelDB.updateById(USERS.file, USERS.sheet, USERS.headers, req.user.id, updates);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update profile", error: err.message });
  }
});

// GET /api/users/:id  (public - used to show pet owner info)
router.get("/:id", async (req, res) => {
  const users = await excelDB.readAll(USERS.file, USERS.sheet, USERS.headers);
  const user = users.find((u) => Number(u.id) === Number(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(publicUser(user));
});

module.exports = router;
