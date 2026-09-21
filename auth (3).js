const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const excelDB = require("../utils/excelDB");
const { USERS } = require("../utils/tables");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, address, bio } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }
    if (!["adopter", "owner"].includes(role)) {
      return res.status(400).json({ message: "role must be 'adopter' or 'owner'" });
    }

    const existing = await excelDB.readAll(USERS.file, USERS.sheet, USERS.headers);
    if (existing.some((u) => String(u.email).toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await excelDB.insert(USERS.file, USERS.sheet, USERS.headers, {
      name,
      email,
      password: hashed,
      role,
      phone: phone || "",
      address: address || "",
      bio: bio || "",
      profileImage: "",
      createdAt: new Date().toISOString(),
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const users = await excelDB.readAll(USERS.file, USERS.sheet, USERS.headers);
    const user = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, String(user.password));
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;
