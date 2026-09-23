# Village Data Collection System — DataSync Pro (MERN Monorepo)

A production-ready **three-application monorepo** for collecting personal, family, and business information from village residents (public form) and managing/reviewing submissions (admin dashboard), with a shared REST API backend and MongoDB persistence.

## Architecture

```
                 ┌────────────────────┐
                 │   frontend (:5173) │
                 │  Public User Form  │
                 └─────────┬──────────┘
                           │ HTTP /api
                           ▼
                 ┌────────────────────┐
                 │   backend (:5000)  │
                 │  Express + Mongo   │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │  MongoDB Database  │
                 └─────────▲──────────┘
                           │ HTTP /api
                 ┌─────────┴──────────┐
                 │ admin-panel (:5174)│
                 │  Admin Dashboard   │
                 └────────────────────┘
```

All three apps run independently with their own `package.json`, `.env`, and dev cycles. Public and admin use separate origins; only the backend talks to the database.

## What's Included

### frontend/ — Public User Application (port **5173**)
- Mobile-first 7-step form flow: **Personal → Address → Family Members → Business/Work → Children → Additional → Review & Submit**
- Success confirmation page with Submission ID
- Form validation (name + mobile required, email/mobile regex)
- Submits to `POST /api/family/submit` (public endpoint, rate-limited)
- **Contains no admin code, no admin routes, no admin tokens** — safe to ship publicly.

### admin-panel/ — Admin Dashboard (port **5174**)
- Admin login at `/login` (JWT-based auth, bcrypt password hashing)
- **Dashboard** — Total Records, Today's Submissions, Business Owners, Professionals / Children counts, Recent Submissions table
- **Records** — search, state/city/occupation/business-type filters, pagination, CSV + Excel export
- **Record Detail** — collapsible sections for Personal, Address, Family, Business, Children, Additional info; status badge
- **Analytics** — bar charts (Recharts) for by-State, by-City, by-Occupation
- Protected routes: unauthenticated visits to `/dashboard`, `/families`, `/analytics` redirect to `/login`
- Logout button (clears token + redirect)

### backend/ — Express REST API (port **5000**)
- **Public**
  - `POST /api/family/submit` — create a family submission record (rate-limited)
  - `GET  /api/health` — service status + DB connection check
- **Admin auth**
  - `POST /api/admin/login` — returns JWT (rate-limited)
- **Admin management**
  - `POST /api/admin/admins` — creates an `admin` or `viewer` account (superadmin only)
- **Admin protected** (all require JWT via `Authorization: Bearer <token>`)
  - `GET    /api/admin/dashboard/stats` — dashboard cards + charts data
  - `GET    /api/admin/families` — paginated list with search + filters
  - `GET    /api/admin/families/:id` — single record full detail
  - `PUT    /api/admin/families/:id` — update a record
  - `DELETE /api/admin/families/:id` — delete a record (requires `admin`/`superadmin` role)
  - `GET    /api/admin/export` — full filtered row set for client-side Excel/CSV/PDF generation
- Security: Helmet, CORS allow-list, Mongo sanitization, bcrypt, JWT, express-rate-limit, mongoose validation + unique indexes
- DB models: `Family` (submissions), `Admin` (dashboard users), `FamilyKey` (optional key-based gating)
- Seed scripts: `seed:admin` — creates first superadmin from `.env`

## Prerequisites

- Node.js 18+
- A MongoDB deployment. **MongoDB Atlas recommended** (it's already a replica set, which any future multi-document transactions will require; local standalone is fine for basic CRUD).

## Quick Start (3 terminals)

```bash
# ── Terminal 1: Backend ─────────────────────────────────────────
cd backend
cp .env .env.local   # fill in MONGO_URI + JWT_SECRET if different
npm install
npm run seed:admin   # one-time: creates admin@example.com / ChangeMe123!
npm run dev          # → http://localhost:5000

# ── Terminal 2: Public Frontend ─────────────────────────────────
cd frontend
npm install
npm run dev          # → http://localhost:5173

# ── Terminal 3: Admin Panel ─────────────────────────────────────
cd admin-panel
npm install
npm run dev          # → http://localhost:5174
```

Then:
- Visit **http://localhost:5173** → fill out the 7-step form → submit → get a Submission ID.
- Visit **http://localhost:5174/login** → sign in with admin creds → dashboard shows your new submission.
- Superadmins can use **Add Admin** in the admin sidebar to create additional admin or viewer logins.

## Production Builds

```bash
cd frontend    && npm run build   # -> dist/ (deploy static)
cd admin-panel && npm run build   # -> dist/ (deploy static)
cd backend     && npm start       # deploy Node host: Render, Railway, Fly.io, etc.
```

Frontend + Admin panel can be hosted on Vercel/Netlify as static sites. Backend needs a Node host.

For production, copy `backend/.env.example` to the backend host's environment settings,
and copy the frontend and admin-panel `.env.example` files to `.env.production` locally or
configure the same values in the hosting provider. Production startup rejects placeholder
JWT secrets, localhost CORS origins, and missing MongoDB configuration.

Run `npm run seed:admin` once from `backend` with the production database configured, then
remove the seed password from the host environment. Existing seeded admins are backfilled
with `SEED_ADMIN_MOBILE` if their mobile number is missing.

## Environment Variables

### `backend/.env`
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/family_business_db
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=http://localhost:5173,http://localhost:5174
SEED_ADMIN_NAME=Super Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_ADMIN_MOBILE=9876543210
```
- `CLIENT_ORIGIN` is a **comma-separated** list. In production set it to your real public-facing and admin-facing domains.
- **Rotate `JWT_SECRET`** and change the seeded admin password before going live. Remove `SEED_ADMIN_PASSWORD` from the host environment after first run.

### `frontend/.env`
```
VITE_API_URL=http://localhost:5000/api
```

### `admin-panel/.env`
```
VITE_API_URL=http://localhost:5000/api
```

All `.env` files are gitignored. Never commit them.

## Project Structure

```
project-root/
├── frontend/                 Public user-facing Vite + React app
│   ├── public/
│   ├── src/
│   │   ├── components/       MobileShell, StepDots, form primitives, FamilyMemberForm, ChildForm
│   │   ├── pages/            FamilyForm, Success, Review (used inside step 7)
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/         api.js (axios, no admin-token logic)
│   │   ├── utils/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.cjs
│   └── vite.config.js        → port 5173
│
├── admin-panel/              Admin dashboard Vite + React app
│   ├── public/
│   ├── src/
│   │   ├── components/       AdminLayout, ProtectedRoute, formPrimitives, MobileShell (login page)
│   │   ├── pages/            AdminLogin, AdminDashboard, FamiliesTable, FamilyDetail, AdminAnalytics
│   │   ├── layouts/
│   │   ├── hooks/            useAuth
│   │   ├── services/         api.js (axios, JWT interceptor, 401 → /login)
│   │   ├── utils/            exportUtils (Excel/CSV/PDF)
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.cjs
│   └── vite.config.js        → port 5174
│
├── backend/                  Express + MongoDB REST API
│   ├── config/               db.js (mongoose connect)
│   ├── controllers/          familyController.js, adminController.js
│   ├── middleware/           auth.js (JWT), rateLimiter.js, errorHandler.js
│   ├── models/               Family.js, Admin.js, FamilyKey.js
│   ├── routes/               familyRoutes.js, adminRoutes.js
│   ├── services/
│   ├── utils/                generateKey.js
│   ├── seed/                 seedAdmin.js, createTestKeys.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── .gitignore
└── README.md
```

## Notes & Intentional Simplifications

- Exports (Excel / CSV / PDF) are generated **client-side** from JSON the API returns. Works well up to tens of thousands of rows; for very large datasets, swap in a server-side generator using `exceljs`, `json2csv`, or `pdfkit` via the existing `/api/admin/export` endpoint.
- The **"Edit Record"** button on the admin record detail is a visual placeholder matching the mockups. The backend endpoint `PUT /api/admin/families/:id` already exists and is fully functional — wire up an edit form on the frontend when you're ready.
- Admin roles are modeled (`superadmin`, `admin`, `viewer`) but only `DELETE` is role-gated today. Extend `requireRole` guards onto `PUT` / `GET /export` etc. as your policy requires.
- Family Key gating (one unique key per submission) is implemented backend-side in the models and a seed script, but the admin key-generation UI hasn't been wired up. Use `node backend/seed/createTestKeys.js 5` or add a `POST /api/admin/keys` endpoint.
