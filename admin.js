const express = require("express");
const excelDB = require("../utils/excelDB");
const { USERS, PETS, ADOPTIONS, LIKES, CONTACTS } = require("../utils/tables");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken, requireRole("admin"));

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  const [users, pets, adoptions] = await Promise.all([
    excelDB.readAll(USERS.file, USERS.sheet, USERS.headers),
    excelDB.readAll(PETS.file, PETS.sheet, PETS.headers),
    excelDB.readAll(ADOPTIONS.file, ADOPTIONS.sheet, ADOPTIONS.headers),
  ]);
  res.json({
    totalUsers: users.length,
    totalAdopters: users.filter((u) => u.role === "adopter").length,
    totalOwners: users.filter((u) => u.role === "owner").length,
    totalPets: pets.length,
    availablePets: pets.filter((p) => p.status === "available").length,
    adoptedPets: pets.filter((p) => p.status === "adopted").length,
    pendingAdoptions: adoptions.filter((a) => a.status === "pending").length,
  });
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const users = await excelDB.readAll(USERS.file, USERS.sheet, USERS.headers);
  res.json(users.map(publicUser));
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  const ok = await excelDB.deleteById(USERS.file, USERS.sheet, USERS.headers, req.params.id);
  if (!ok) return res.status(404).json({ message: "User not found" });
  res.json({ message: "User deleted" });
});

// GET /api/admin/pets
router.get("/pets", async (req, res) => {
  const [pets, users] = await Promise.all([
    excelDB.readAll(PETS.file, PETS.sheet, PETS.headers),
    excelDB.readAll(USERS.file, USERS.sheet, USERS.headers),
  ]);
  const full = pets.map((p) => ({
    ...p,
    images: p.images ? String(p.images).split(",").filter(Boolean) : [],
    ownerName: (users.find((u) => Number(u.id) === Number(p.ownerId)) || {}).name || "Unknown",
  }));
  res.json(full);
});

// DELETE /api/admin/pets/:id
router.delete("/pets/:id", async (req, res) => {
  const ok = await excelDB.deleteById(PETS.file, PETS.sheet, PETS.headers, req.params.id);
  if (!ok) return res.status(404).json({ message: "Pet not found" });
  res.json({ message: "Pet listing deleted" });
});

// GET /api/admin/adoptions
router.get("/adoptions", async (req, res) => {
  const [adoptions, pets, users] = await Promise.all([
    excelDB.readAll(ADOPTIONS.file, ADOPTIONS.sheet, ADOPTIONS.headers),
    excelDB.readAll(PETS.file, PETS.sheet, PETS.headers),
    excelDB.readAll(USERS.file, USERS.sheet, USERS.headers),
  ]);
  const full = adoptions
    .map((a) => ({
      ...a,
      petName: (pets.find((p) => Number(p.id) === Number(a.petId)) || {}).name || "Unknown pet",
      adopterName: (users.find((u) => Number(u.id) === Number(a.adopterId)) || {}).name || "Unknown",
      ownerName: (users.find((u) => Number(u.id) === Number(a.ownerId)) || {}).name || "Unknown",
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(full);
});

// PUT /api/admin/adoptions/:id   { status: 'approved' | 'rejected' }
router.put("/adoptions/:id", async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ message: "status must be approved, rejected or pending" });
  }
  const updated = await excelDB.updateById(ADOPTIONS.file, ADOPTIONS.sheet, ADOPTIONS.headers, req.params.id, {
    status,
  });
  if (!updated) return res.status(404).json({ message: "Adoption request not found" });

  if (status === "approved") {
    await excelDB.updateById(PETS.file, PETS.sheet, PETS.headers, updated.petId, { status: "adopted" });
  } else if (status === "rejected") {
    await excelDB.updateById(PETS.file, PETS.sheet, PETS.headers, updated.petId, { status: "available" });
  }
  res.json(updated);
});

// GET /api/admin/contacts
router.get("/contacts", async (req, res) => {
  const contacts = await excelDB.readAll(CONTACTS.file, CONTACTS.sheet, CONTACTS.headers);
  res.json(contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

module.exports = router;
