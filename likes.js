const express = require("express");
const excelDB = require("../utils/excelDB");
const { LIKES } = require("../utils/tables");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// POST /api/likes/:petId  - toggle like/unlike
router.post("/:petId", verifyToken, async (req, res) => {
  try {
    const likes = await excelDB.readAll(LIKES.file, LIKES.sheet, LIKES.headers);
    const existing = likes.find(
      (l) => Number(l.petId) === Number(req.params.petId) && Number(l.userId) === Number(req.user.id)
    );

    if (existing) {
      await excelDB.deleteById(LIKES.file, LIKES.sheet, LIKES.headers, existing.id);
      return res.json({ liked: false });
    }

    await excelDB.insert(LIKES.file, LIKES.sheet, LIKES.headers, {
      petId: req.params.petId,
      userId: req.user.id,
      createdAt: new Date().toISOString(),
    });
    res.json({ liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update like", error: err.message });
  }
});

// GET /api/likes/mine - pets the current user liked (list of petIds)
router.get("/mine/list", verifyToken, async (req, res) => {
  const likes = await excelDB.readAll(LIKES.file, LIKES.sheet, LIKES.headers);
  const mine = likes.filter((l) => Number(l.userId) === Number(req.user.id));
  res.json(mine.map((l) => Number(l.petId)));
});

module.exports = router;
