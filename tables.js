const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const USERS = {
  file: path.join(DATA_DIR, "users.xlsx"),
  sheet: "Users",
  headers: [
    "id",
    "name",
    "email",
    "password",
    "role", // adopter | owner | admin
    "phone",
    "address",
    "bio",
    "profileImage",
    "createdAt",
  ],
};

const PETS = {
  file: path.join(DATA_DIR, "pets.xlsx"),
  sheet: "Pets",
  headers: [
    "id",
    "ownerId",
    "name",
    "species",
    "breed",
    "age",
    "gender",
    "description",
    "images", // comma separated relative paths, min 3
    "status", // available | pending | adopted
    "createdAt",
  ],
};

const LIKES = {
  file: path.join(DATA_DIR, "likes.xlsx"),
  sheet: "Likes",
  headers: ["id", "petId", "userId", "createdAt"],
};

const MESSAGES = {
  file: path.join(DATA_DIR, "messages.xlsx"),
  sheet: "Messages",
  headers: ["id", "petId", "senderId", "receiverId", "message", "createdAt"],
};

const ADOPTIONS = {
  file: path.join(DATA_DIR, "adoptions.xlsx"),
  sheet: "Adoptions",
  headers: [
    "id",
    "petId",
    "adopterId",
    "ownerId",
    "status", // pending | approved | rejected
    "createdAt",
  ],
};

const CONTACTS = {
  file: path.join(DATA_DIR, "contacts.xlsx"),
  sheet: "Contacts",
  headers: ["id", "name", "email", "message", "createdAt"],
};

module.exports = { DATA_DIR, USERS, PETS, LIKES, MESSAGES, ADOPTIONS, CONTACTS };
