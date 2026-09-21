const express = require("express");
const excelDB = require("../utils/excelDB");
const { MESSAGES, USERS, PETS } = require("../utils/tables");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// POST /api/chat/send  { petId, receiverId, message }
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { petId, receiverId, message } = req.body;
    if (!petId || !receiverId || !message || !message.trim()) {
      return res.status(400).json({ message: "petId, receiverId and message are required" });
    }
    const saved = await excelDB.insert(MESSAGES.file, MESSAGES.sheet, MESSAGES.headers, {
      petId,
      senderId: req.user.id,
      receiverId,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send message", error: err.message });
  }
});

// GET /api/chat/conversation?petId=&withUserId=
// Returns the full back-and-forth between the current user and withUserId about petId
router.get("/conversation", verifyToken, async (req, res) => {
  try {
    const { petId, withUserId } = req.query;
    if (!petId || !withUserId) {
      return res.status(400).json({ message: "petId and withUserId are required" });
    }
    const all = await excelDB.readAll(MESSAGES.file, MESSAGES.sheet, MESSAGES.headers);
    const thread = all.filter((m) => {
      const samePet = Number(m.petId) === Number(petId);
      const pairMatches =
        (Number(m.senderId) === Number(req.user.id) && Number(m.receiverId) === Number(withUserId)) ||
        (Number(m.senderId) === Number(withUserId) && Number(m.receiverId) === Number(req.user.id));
      return samePet && pairMatches;
    });
    thread.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(thread);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load conversation", error: err.message });
  }
});

// GET /api/chat/inbox - list distinct conversations for the logged-in user
router.get("/inbox", verifyToken, async (req, res) => {
  try {
    const [messages, users, pets] = await Promise.all([
      excelDB.readAll(MESSAGES.file, MESSAGES.sheet, MESSAGES.headers),
      excelDB.readAll(USERS.file, USERS.sheet, USERS.headers),
      excelDB.readAll(PETS.file, PETS.sheet, PETS.headers),
    ]);

    const mine = messages.filter(
      (m) => Number(m.senderId) === Number(req.user.id) || Number(m.receiverId) === Number(req.user.id)
    );

    const map = new Map(); // key: petId-otherUserId
    mine.forEach((m) => {
      const otherId = Number(m.senderId) === Number(req.user.id) ? m.receiverId : m.senderId;
      const key = `${m.petId}-${otherId}`;
      const existing = map.get(key);
      if (!existing || new Date(m.createdAt) > new Date(existing.createdAt)) {
        map.set(key, m);
      }
    });

    const conversations = Array.from(map.values())
      .map((m) => {
        const otherId = Number(m.senderId) === Number(req.user.id) ? m.receiverId : m.senderId;
        const otherUser = users.find((u) => Number(u.id) === Number(otherId));
        const pet = pets.find((p) => Number(p.id) === Number(m.petId));
        return {
          petId: Number(m.petId),
          petName: pet ? pet.name : "Pet",
          otherUserId: Number(otherId),
          otherUserName: otherUser ? otherUser.name : "User",
          lastMessage: m.message,
          lastMessageAt: m.createdAt,
        };
      })
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load inbox", error: err.message });
  }
});

module.exports = router;
