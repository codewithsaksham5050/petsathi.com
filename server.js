require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const excelDB = require("./utils/excelDB");
const { USERS, DATA_DIR } = require("./utils/tables");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const petRoutes = require("./routes/pets");
const likeRoutes = require("./routes/likes");
const chatRoutes = require("./routes/chat");
const adminRoutes = require("./routes/admin");
const contactRoutes = require("./routes/contact");

const app = express();
const PORT = process.env.PORT || 5000;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- middleware ----
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// serve the frontend (static site) so the whole thing can run from one server
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR));

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", site: "petsath.com" }));

// fall back to index.html for the root
app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));

// ---- seed default admin account ----
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";
  if (!email || !password) return;

  const users = await excelDB.readAll(USERS.file, USERS.sheet, USERS.headers);
  const exists = users.some((u) => String(u.email).toLowerCase() === email.toLowerCase());
  if (exists) return;

  const hashed = await bcrypt.hash(password, 10);
  await excelDB.insert(USERS.file, USERS.sheet, USERS.headers, {
    name,
    email,
    password: hashed,
    role: "admin",
    phone: "",
    address: "",
    bio: "Site administrator",
    profileImage: "",
    createdAt: new Date().toISOString(),
  });
  console.log(`Seeded admin account -> ${email} (change the password after first login!)`);
}

seedAdmin()
  .catch((err) => console.error("Failed to seed admin:", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`petsath.com backend running on http://localhost:${PORT}`);
    });
  });
