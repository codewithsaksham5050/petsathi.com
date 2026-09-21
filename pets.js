const express = require("express");
const fs = require("fs");
const path = require("path");
const excelDB = require("../utils/excelDB");
const { PETS, USERS, LIKES, ADOPTIONS } = require("../utils/tables");
const { verifyToken, requireRole, optionalAuth } = require("../middleware/auth");
const { uploadPetImages } = require("../middleware/upload");

const router = express.Router();

async function attachExtras(pet, currentUserId) {
  const [owners, likes] = await Promise.all([
    excelDB.readAll(USERS.file, USERS.sheet, USERS.headers),
    excelDB.readAll(LIKES.file, LIKES.sheet, LIKES.headers),
  ]);
  const owner = owners.find((u) => Number(u.id) === Number(pet.ownerId));
  const petLikes = likes.filter((l) => Number(l.petId) === Number(pet.id));
  return {
    ...pet,
    images: pet.images ? String(pet.images).split(",").filter(Boolean) : [],
    ownerName: owner ? owner.name : "Unknown",
    ownerPhone: owner ? owner.phone : "",
    likeCount: petLikes.length,
    likedByMe: currentUserId
      ? petLikes.some((l) => Number(l.userId) === Number(currentUserId))
      : false,
  };
}

// GET /api/pets  ?species=&status=&search=
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { species, status, search } = req.query;
    let pets = await excelDB.readAll(PETS.file, PETS.sheet, PETS.headers);

    if (species) pets = pets.filter((p) => String(p.species).toLowerCase() === species.toLowerCase());
    if (status) pets = pets.filter((p) => String(p.status).toLowerCase() === status.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      pets = pets.filter(
        (p) =>
          String(p.name).toLowerCase().includes(q) ||
          String(p.breed).toLowerCase().includes(q) ||
          String(p.description).toLowerCase().includes(q)
      );
    }

    pets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const full = await Promise.all(pets.map((p) => attachExtras(p, req.user && req.user.id)));
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load pets", error: err.message });
  }
});

// GET /api/pets/:id
router.get("/:id", optionalAuth, async (req, res) => {
  const pets = await excelDB.readAll(PETS.file, PETS.sheet, PETS.headers);
  const pet = pets.find((p) => Number(p.id) === Number(req.params.id));
  if (!pet) return res.status(404).json({ message: "Pet not found" });
  res.json(await attachExtras(pet, req.user && req.user.id));
});

// POST /api/pets  (owner or admin only) - requires at least 3 images
router.post(
  "/",
  verifyToken,
  requireRole("owner", "admin"),
  uploadPetImages.array("images", 8),
  async (req, res) => {
    try {
      const { name, species, breed, age, gender, description } = req.body;
      if (!name || !species) {
        return res.status(400).json({ message: "name and species are required" });
      }
      if (!req.files || req.files.length < 3) {
        return res.status(400).json({ message: "Please upload at least 3 images of the pet" });
      }

      const images = req.files.map((f) => `/uploads/pets/${f.filename}`).join(",");
      const pet = await excelDB.insert(PETS.file, PETS.sheet, PETS.headers, {
        ownerId: req.user.id,
        name,
        species,
        breed: breed || "",
        age: age || "",
        gender: gender || "",
        description: description || "",
        images,
        status: "available",
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(await attachExtras(pet, req.user.id));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Could not create pet listing", error: err.message });
    }
  }
);

// PUT /api/pets/:id  (owner of the pet, or admin)
router.put("/:id", verifyToken, uploadPetImages.array("images", 8), async (req, res) => {
  try {
    const pets = await excelDB.readAll(PETS.file, PETS.sheet, PETS.headers);
    const pet = pets.find((p) => Number(p.id) === Number(req.params.id));
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (Number(pet.ownerId) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only edit your own pet listings" });
    }

    const { name, species, breed, age, gender, description, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (species !== undefined) updates.species = species;
    if (breed !== undefined) updates.breed = breed;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map((f) => `/uploads/pets/${f.filename}`).join(",");
    }

    const updated = await excelDB.updateById(PETS.file, PETS.sheet, PETS.headers, req.params.id, updates);
    res.json(await attachExtras(updated, req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update pet", error: err.message });
  }
});

// DELETE /api/pets/:id (owner of the pet, or admin)
router.delete("/:id", verifyToken, async (req, res) => {
  const pets = await excelDB.readAll(PETS.file, PETS.sheet, PETS.headers);
  const pet = pets.find((p) => Number(p.id) === Number(req.params.id));
  if (!pet) return res.status(404).json({ message: "Pet not found" });
  if (Number(pet.ownerId) !== Number(req.user.id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "You can only delete your own pet listings" });
  }
  await excelDB.deleteById(PETS.file, PETS.sheet, PETS.headers, req.params.id);
  res.json({ message: "Pet listing deleted" });
});

// POST /api/pets/:id/adopt  (adopter requests to adopt this pet)
router.post("/:id/adopt", verifyToken, requireRole("adopter", "admin"), async (req, res) => {
  const pets = await excelDB.readAll(PETS.file, PETS.sheet, PETS.headers);
  const pet = pets.find((p) => Number(p.id) === Number(req.params.id));
  if (!pet) return res.status(404).json({ message: "Pet not found" });

  const existing = await excelDB.readAll(ADOPTIONS.file, ADOPTIONS.sheet, ADOPTIONS.headers);
  const already = existing.find(
    (a) =>
      Number(a.petId) === Number(pet.id) &&
      Number(a.adopterId) === Number(req.user.id) &&
      a.status === "pending"
  );
  if (already) return res.status(409).json({ message: "You already requested to adopt this pet" });

  const record = await excelDB.insert(ADOPTIONS.file, ADOPTIONS.sheet, ADOPTIONS.headers, {
    petId: pet.id,
    adopterId: req.user.id,
    ownerId: pet.ownerId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await excelDB.updateById(PETS.file, PETS.sheet, PETS.headers, pet.id, { status: "pending" });
  res.status(201).json(record);
});

// GET /api/pets/mine/list - pets owned by the logged in user
router.get("/mine/list", verifyToken, async (req, res) => {
  const pets = await excelDB.readAll(PETS.file, PETS.sheet, PETS.headers);
  const mine = pets.filter((p) => Number(p.ownerId) === Number(req.user.id));
  const full = await Promise.all(mine.map((p) => attachExtras(p, req.user.id)));
  res.json(full);
});

module.exports = router;
