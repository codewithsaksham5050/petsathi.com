const express = require("express");
const excelDB = require("../utils/excelDB");
const { CONTACTS } = require("../utils/tables");

const router = express.Router();

// POST /api/contact  { name, email, message }
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "name, email and message are required" });
    }
    const saved = await excelDB.insert(CONTACTS.file, CONTACTS.sheet, CONTACTS.headers, {
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: "Thanks! We received your message.", saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send message", error: err.message });
  }
});

module.exports = router;
