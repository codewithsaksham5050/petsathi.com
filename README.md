# petsath.com — Pet Adoption Website

A full-stack pet adoption platform:
- **Pet Adopters** and **Pet Owners** (people giving a pet up for adoption) can both register and manage a profile.
- Pet owners list pets with a **minimum of 3 photos**.
- Anyone can **like** a pet, and **chat** directly with the pet's owner.
- Adopters can **request adoption**; the **Admin Panel** reviews and approves/rejects requests.
- **All data is stored in Excel (.xlsx) files** on the server — no external database needed.

---

## 1. Folder structure

```
petsath/
├── backend/                     Node.js + Express API
│   ├── data/                    Auto-created .xlsx files (your "database")
│   │   ├── users.xlsx
│   │   ├── pets.xlsx
│   │   ├── likes.xlsx
│   │   ├── messages.xlsx
│   │   ├── adoptions.xlsx
│   │   └── contacts.xlsx
│   ├── middleware/
│   │   ├── auth.js              JWT auth + role checks
│   │   └── upload.js            Multer image upload config
│   ├── routes/
│   │   ├── auth.js              Register / Login
│   │   ├── users.js             Profile get/update
│   │   ├── pets.js              Pet CRUD, adopt request
│   │   ├── likes.js             Like / unlike a pet
│   │   ├── chat.js              Messaging between users
│   │   ├── admin.js             Admin-only management routes
│   │   └── contact.js           Public contact form
│   ├── utils/
│   │   ├── excelDB.js           Generic Excel read/write helper
│   │   ├── mutex.js             Prevents concurrent file corruption
│   │   └── tables.js            Table/column definitions
│   ├── uploads/                 Uploaded pet & profile photos
│   ├── .env                     Configuration (JWT secret, admin login, port)
│   ├── package.json
│   └── server.js                App entry point
│
└── frontend/                    Plain HTML/CSS/JS (no build step needed)
    ├── css/style.css
    ├── js/api.js                Talks to the backend API
    ├── js/main.js                Shared header/footer/menu + helpers
    ├── index.html                Home
    ├── gallery.html              Browse all pets (filters + like)
    ├── pet-details.html          Pet profile, gallery, like, adopt, chat
    ├── login.html
    ├── register.html             Choose "Adopter" or "Owner" role
    ├── profile.html              Edit profile, manage pets, likes, inbox
    ├── admin.html                Admin dashboard (users/pets/adoptions)
    ├── help.html                 FAQ
    └── contact.html              Contact form
```

---

## 2. Requirements

- [Node.js](https://nodejs.org) v18 or newer (includes npm)

---

## 3. Setup & Run

```bash
cd backend
npm install
npm start
```

The server starts at **http://localhost:5000** and serves both the API (`/api/...`)
**and** the frontend website itself — so you only need to open one URL:

```
http://localhost:5000
```

On first start, it automatically creates the `data/` Excel files and seeds an
**admin account** using the values in `backend/.env`:

```
ADMIN_EMAIL=pandeysaksham288@gmail.com
ADMIN_PASSWORD=Admin@12345
```

Log in with those credentials, then open **Admin Panel** from the top menu.
**Change the admin password** (edit `.env`, delete the admin row from
`data/users.xlsx`, and restart, or add a "change password" flow) before going live.

### Running frontend and backend separately (optional)
If you prefer to open the frontend files directly with a tool like VS Code's
"Live Server" (usually on port 5500), the frontend already detects this and
points API calls to `http://localhost:5000/api` automatically — just make
sure the backend (`npm start` in `backend/`) is running too.

---

## 4. How the Excel "database" works

Every table is a `.xlsx` file inside `backend/data/`, opened and rewritten with
the [`exceljs`](https://www.npmjs.com/package/exceljs) library on every read/write.
You can literally open these files in Excel to inspect your data (close them in
Excel before the server writes again, or Excel may show a "file changed" prompt).

| File            | What it stores                                   |
|------------------|---------------------------------------------------|
| `users.xlsx`     | Adopters, owners, and the admin account (password is hashed) |
| `pets.xlsx`      | Pet listings, including image paths and status    |
| `likes.xlsx`     | Which users liked which pets                       |
| `messages.xlsx`  | Chat messages between adopters and owners          |
| `adoptions.xlsx` | Adoption requests and their approval status        |
| `contacts.xlsx`  | Messages sent through the Contact page             |

Uploaded photos are saved as real files under `backend/uploads/pets/` and
`backend/uploads/profiles/` (Excel only stores the file *path*, not the image
itself, since spreadsheets aren't meant to hold binary image data).

---

## 5. User roles

| Role      | Can do |
|-----------|--------|
| `adopter` | Register, edit profile, browse/like pets, chat with owners, request adoption |
| `owner`   | Register, edit profile, list pets (3+ photos required), edit/delete their own listings, chat with adopters |
| `admin`   | Everything above, plus: view all users/pets, delete any user or pet, approve/reject adoption requests, view contact messages |

---

## 6. Key API endpoints (for reference)

```
POST   /api/auth/register        { name, email, password, role, phone, address }
POST   /api/auth/login           { email, password }

GET    /api/users/me
PUT    /api/users/me             (multipart: name, phone, address, bio, profileImage)
GET    /api/users/:id

GET    /api/pets                 ?species=&status=&search=
GET    /api/pets/:id
POST   /api/pets                 (multipart, images[] min 3) — owner/admin only
PUT    /api/pets/:id             — owner of pet / admin
DELETE /api/pets/:id             — owner of pet / admin
POST   /api/pets/:id/adopt       — adopter
GET    /api/pets/mine/list       — pets the logged-in owner listed

POST   /api/likes/:petId         toggle like/unlike
GET    /api/likes/mine/list

POST   /api/chat/send            { petId, receiverId, message }
GET    /api/chat/conversation    ?petId=&withUserId=
GET    /api/chat/inbox

GET    /api/admin/stats
GET    /api/admin/users
DELETE /api/admin/users/:id
GET    /api/admin/pets
DELETE /api/admin/pets/:id
GET    /api/admin/adoptions
PUT    /api/admin/adoptions/:id  { status: 'approved' | 'rejected' }
GET    /api/admin/contacts

POST   /api/contact              { name, email, message }
```

---

## 7. Notes & next steps

- Excel-file storage is great for a small/medium site, but every request
  reads/writes the whole file — for heavy traffic, migrate to a real database
  (MongoDB/MySQL) later; the `excelDB.js` helper is isolated so this is a
  straightforward swap.
- Chat currently refreshes every 4 seconds (polling). For instant delivery,
  add `socket.io` on top of the existing `/api/chat` routes.
- Set a strong, unique `JWT_SECRET` in `.env` before deploying.
- Update `ADMIN_PASSWORD` immediately after first login.
