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
- **Excel round trip** — download all family records, preview `.xlsx` / `.xls` updates, and confirm additions or updates from the dashboard
- **Records** — search, state/city/occupation/business-type filters, pagination, CSV + Excel export
- **Record Detail** — collapsible sections for Personal, Address, Family, Business, Children, Additional info; status badge
- **Analytics** — bar charts (Recharts) for by-State, by-City, by-Occupation
- Protected routes: unauthenticated visits to `/dashboard`, `/families`, `/analytics` redirect to `/login`
- Logout button (clears token + redirect)

### backend/ — Express REST API (port **5000**)
- **Public**
  - `POST /api/family/submit` — create a family submission record (rate-limited; family-member mobile numbers are **not** required to be unique)
  - `GET  /api/health` — service status + DB connection check
- **Public accounts** (`/api/users`) — the app's own user accounts
  - `POST /api/users/register` — create an account; the mobile number is normalized to E.164 and must be unique across accounts
  - `POST /api/users/login` — sign in; returns a user JWT (`typ: 'user'`)
  - `GET  /api/users/me` — read the signed-in profile
  - `PUT  /api/users/me` — update the signed-in profile (keeping your own number is always allowed)
- **Admin auth**
  - `POST /api/admin/login` — returns JWT (rate-limited)
- **Admin protected** (all require JWT via `Authorization: Bearer <token>`)
  - `GET    /api/admin/dashboard/stats` — dashboard cards + charts data
  - `GET    /api/admin/families` — paginated list with search + filters
  - `GET    /api/admin/families/:id` — single record full detail
  - `PUT    /api/admin/families/:id` — update a record
  - `DELETE /api/admin/families/:id` — delete a record (requires `admin`/`superadmin` role)
  - `GET    /api/admin/export` — full filtered row set for client-side Excel/CSV/PDF generation
  - `GET    /api/export/excel` — download all records in a round-trip workbook (or an empty-data template)
  - `POST   /api/import/excel/preview` — validate and preview an `.xlsx` / `.xls` workbook without saving
  - `POST   /api/import/excel/confirm` — apply a validated preview, matching existing records by `submissionId`
- **Automatic daily backup** (`/api/admin/backup`)
  - `GET  /api/admin/backup/status` — schedule summary, last run and last success (admin JWT)
  - `GET  /api/admin/backup/history` — most recent runs, newest first (admin JWT)
  - `POST /api/admin/backup/run` — trigger a backup immediately (admin JWT, `admin`/`superadmin` role)
  - `POST /api/admin/backup/cron` — external-scheduler entry point, guarded by the `x-backup-secret` header instead of a JWT (see [Automatic daily Excel backup](#automatic-daily-excel-backup-to-google-drive))
- Security: Helmet, CORS allow-list, Mongo sanitization, bcrypt, JWT, express-rate-limit, mongoose validation + unique indexes
- DB models: `Family` (submissions), `Admin` (dashboard users), `User` (public accounts), `FamilyKey` (optional key-based gating), `BackupRun` (backup history + durable lock)
- The daily backup uploads the **same** workbook the admin Excel download produces — one shared builder (`services/familyWorkbook.js`), so the two can never drift apart.
- On startup, the backend removes a legacy unique index on the main mobile number so it does not block later submissions using that number.
- Seed scripts: `seed:admin` — creates first superadmin from `.env`
- Migration scripts: `migrate:mobile`, `migrate:mobile:apply`
- Tests: run `npm test` from `backend/` (Node's built-in runner; DB-backed tests connect to `TEST_MONGO_URI` and auto-skip when no database is reachable)

## Prerequisites

- Node.js 20.11+ (the suite runs with `--test-concurrency=1`; Node 18 reached end-of-life in April 2025).
- A MongoDB deployment. **MongoDB Atlas recommended** — it is already a replica set and requires no extra infrastructure.

## Quick Start (3 terminals)

```bash
# ── Terminal 1: Backend ─────────────────────────────────────────
cd backend
cp .env.example .env   # then fill in MONGO_URI + JWT_SECRET (Windows: copy .env.example .env)
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
The authoritative list lives in [`backend/.env.example`](backend/.env.example). Core values:

```
PORT=5000
NODE_ENV=development
HOST=0.0.0.0
MONGO_URI=mongodb://localhost:27017/family_business_db
# Optional: override Node's DNS servers for Atlas SRV lookup timeouts (comma-separated IP addresses)
# MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8
JWT_SECRET=replace_this_with_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=8h
USER_JWT_EXPIRES_IN=30d
CLIENT_ORIGIN=http://localhost:5173,http://localhost:5174
DEFAULT_PHONE_COUNTRY=IN
SEED_ADMIN_NAME=Super Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_ADMIN_MOBILE=9876543210
```

- `CLIENT_ORIGIN` is a **comma-separated** list. In production set it to your real public-facing and admin-facing domains.
- `DEFAULT_PHONE_COUNTRY` is the country assumed when a mobile number is entered **without** an explicit `+` country code (default `IN`). Numbers that already start with `+` are never reinterpreted.
- If local startup reports `querySrv ETIMEOUT` or `querySrv ECONNREFUSED` for Atlas, add `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` to `backend/.env` and restart the backend. If it persists, check your network, VPN, or firewall DNS settings.
- **Rotate `JWT_SECRET`** and change the seeded admin password before going live. Remove `SEED_ADMIN_PASSWORD` from the host environment after first run.

#### Automatic backup variables (optional)

The daily backup stays completely off until the four Google values are set. **Leave them empty** and the backend behaves exactly as before — the scheduler simply does not start. All of these live on the **backend** only; none are ever sent to the frontend.

```
# Google Cloud → APIs & Services → Credentials → OAuth client ID → Web application
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
# Long-lived refresh token for the Google account that owns the backup folder
GOOGLE_REFRESH_TOKEN=
# Destination folder: bare id or the full ".../folders/<id>" share URL
GOOGLE_DRIVE_FOLDER_ID=
# drive.file is enough — the app only manages the file it creates
GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/drive.file

# Schedule
BACKUP_ENABLED=true
BACKUP_DAILY_HOUR=2
BACKUP_TIMEZONE=Asia/Kolkata
BACKUP_INTERVAL_SECONDS=300
BACKUP_LOCK_MINUTES=30
BACKUP_MAX_ATTEMPTS=3
BACKUP_FILE_NAME=family-details-backup.xlsx
# Optional: shared secret for an external scheduler hitting POST /api/admin/backup/cron
BACKUP_CRON_SECRET=
```

### `frontend/.env`
```
VITE_API_URL=http://localhost:5000/api
```

### `admin-panel/.env`
```
VITE_API_URL=http://localhost:5000/api
```

All `.env` files are gitignored. Never commit them.

## Mobile number uniqueness (accounts)

Every **account** (`User`, and seeded `Admin` users) has a unique mobile number. This is enforced twice:

1. **Application layer** — `backend/utils/phone.js` normalizes input with `libphonenumber-js` to E.164 before comparing or saving, so `9876543210`, `09876543210`, `+91 98765 43210` and `+919876543210` are all treated as the same number. The controller pre-checks for an existing owner **and** catches duplicate-key errors (code `11000`) to close the race between two simultaneous registrations.
2. **Database layer** — a unique MongoDB index on `users.mobileNumber` (and `admins.mobileNumber`) is the final guard.

Behaviour:
- Registering or updating to a number owned by **another** account returns **HTTP 409** with the exact message `This mobile number is already registered. Please use a different mobile number.` and code `MOBILE_TAKEN`. The rest of the form data is left intact on the client.
- A user updating their profile **may keep their own** number; only another account's number is rejected.
- Family-member mobile numbers inside a submission (`Family.familyMembers[].mobileNumber`) are **not** unique — only accounts are.
- Unparseable numbers are rejected with HTTP 400 before uniqueness is checked.

### Duplicate mobile resolution

The migration script **never deletes, merges or overwrites** data. It reports first:

```bash
cd backend
npm run migrate:mobile            # dry run — prints duplicate groups (exit code 2 if any found)
npm run migrate:mobile:apply      # normalize stored values to E.164 + create the unique indexes
# add --normalize-only to normalise without creating the index:
# node scripts/migrateMobileUniqueness.js --apply --normalize-only
```

If the dry run reports duplicates, resolve them **manually** first (decide which account keeps the number, ask the owner to change the other, or correct a mistyped digit). The script refuses to create the unique index while duplicates remain, so it cannot silently drop data.

## Automatic daily Excel backup to Google Drive

The backend can back up the entire family dataset to Google Drive **once a day** by uploading the **exact same workbook** the admin *Excel Download* produces — same sheet name, headers, column order, formatting and dynamic family-member columns. There is one shared generator ([`backend/services/familyWorkbook.js`](backend/services/familyWorkbook.js)) used by both the download and the backup, so the two outputs can never drift apart.

**Scheduled time:** `02:00 Asia/Kolkata` (`BACKUP_DAILY_HOUR=2`, `BACKUP_TIMEZONE=Asia/Kolkata`). If the host is asleep or restarting at 02:00, the backup runs at the first check after it wakes — the schedule is decided from the last successful run stored in MongoDB, not from an in-memory timer, so it survives restarts (important on Render's free tier).

### How it works

1. On boot the backend calls `startBackupScheduler()`. If Drive is not configured it logs which variables are missing and does nothing else.
2. Every `BACKUP_INTERVAL_SECONDS` (default 300s) the scheduler checks MongoDB: *has today's backup succeeded yet?* If not (and the local hour ≥ `BACKUP_DAILY_HOUR`), it runs one.
3. A run generates the workbook, then **updates the single file** `family-details-backup.xlsx` in the configured folder (creating it only the first time), and verifies Drive reports the same byte count that was uploaded.
4. Success requires a Drive file id **and** a matching size. Anything else is recorded as `failed` and the previous good backup is left untouched.

### Google Cloud / OAuth setup (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com/) create (or pick) a project and **enable the Google Drive API**.
2. **APIs & Services → OAuth consent screen** — configure it (External is fine). Add the Google account that owns the backup folder as a **Test user** so the refresh token does not expire while the app is in "Testing".
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**. Add `https://developers.google.com/oauthplayground` as an authorised **redirect URI**. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. Mint a refresh token with the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):
   - Gear icon (top right) → tick **Use your own OAuth credentials** → paste the Client ID + secret.
   - In Step 1 select the scope `https://www.googleapis.com/auth/drive.file` → **Authorize APIs** → sign in with the folder owner.
   - In Step 2 click **Exchange authorization code for tokens** → copy the **Refresh token** into `GOOGLE_REFRESH_TOKEN`.
5. In Google Drive create a folder for backups (e.g. `Family Backups`), share it with the same account, and copy its id from the URL `https://drive.google.com/drive/folders/<THIS_ID>` into `GOOGLE_DRIVE_FOLDER_ID` (a bare id or the full URL both work).

### Scheduler configuration

Two supported setups; **both share the same lock** and cannot overlap.

- **In-process (default, no extra config).** The backend starts the scheduler on boot — nothing else to do beyond the environment variables above. Recommended on any always-on Node host.
- **External scheduler (belt-and-braces).** Point a platform cron job (Render Cron Job, GitHub Actions, cron-job.org, …) at the protected endpoint once a day at 02:00 Asia/Kolkata:

  ```bash
  curl -X POST https://<your-backend-host>/api/admin/backup/cron \
       -H "x-backup-secret: $BACKUP_CRON_SECRET"
  ```

  Set `BACKUP_CRON_SECRET` to a long random string on the backend. If it is unset the endpoint returns `503`; a wrong/missing secret returns `401`. Runs may be triggered more often than daily — the scheduler/lock simply no-ops when today's backup already succeeded.

### Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/backup/status` | admin JWT | Config summary, last run, last success |
| `GET` | `/api/admin/backup/history?limit=20` | admin JWT | Recent runs, newest first |
| `POST` | `/api/admin/backup/run` | admin JWT (`admin`/`superadmin`) | Run a backup now |
| `POST` | `/api/admin/backup/cron` | `x-backup-secret` header | External-scheduler trigger |

`GET /status` reports whether Drive is configured and lists **missing variable names** (never their values), plus the resolved schedule — the quickest way to confirm the feature is live.

### Reliability & security

- **No overlapping runs** — an in-process guard plus a durable `BackupRun` row with `status: 'running'` (stale after `BACKUP_LOCK_MINUTES`). A second attempt returns `409`.
- **Never a false success** — the run is only marked `success` after Drive returns a file id and the stored byte count matches the uploaded buffer (`UPLOAD_SIZE_MISMATCH` otherwise).
- **Retries with backoff** — up to `BACKUP_MAX_ATTEMPTS` (default 3), backing off 1s → 2s → 4s → … capped at 8s.
- **Start / finish / result / error** are logged (`[backup] …`) and persisted on the `BackupRun` (timestamps, duration, size, record count, attempts, `errorCode`, `errorMessage`).
- **Failure is visible** — the latest run's `failed` status and error are returned by `GET /status` and `GET /history`; a failed run never overwrites the previous good file.
- **Secrets stay server-side** — credentials live only in backend env vars; the status endpoint exposes configuration *shape*, never secret values.

### Verifying after deploy

1. `GET https://<backend>/api/admin/backup/status` (with an admin JWT) → `config.driveConfigured` should be `true` and `config.schedule` should read `02:00 Asia/Kolkata`.
2. `POST https://<backend>/api/admin/backup/run` (admin JWT) → `success: true` with a `run.fileId`; confirm the file appears in the Drive folder.
3. Download the workbook from the admin *Excel Download* button and open both files side by side — sheet name (`Family Records`), headers, column order and rows must match exactly.
4. Trigger the run again → the same Drive file is **updated in place** (unchanged file id, no duplicate).
5. Restart the backend → the logs show `[backup] scheduler started` and a catch-up run only if today's backup had not yet succeeded.

> The backup is only active once the Google variables are set **and** the backend has been redeployed. Until then it is inert and the app runs exactly as before.

## Deploying to Render

1. **Backend (Web Service)**
   - Root directory `backend`, build `npm install`, start `npm start`.
   - Add all `backend/.env` values (except `SEED_ADMIN_PASSWORD` after the first deploy) as environment variables.
   - Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CLIENT_ORIGIN` = your deployed frontend + admin-panel URLs (comma-separated).
2. **Frontend and Admin panel (Static Sites)**
   - Root directories `frontend` / `admin-panel`, build `npm install && npm run build`, publish directory `dist`.
   - Set `VITE_API_URL=https://<your-backend-host>/api` at build time.
3. **First deploy checklist**
   - Run `npm run migrate:mobile` (dry run) → resolve any duplicates → `npm run migrate:mobile:apply` to create the unique indexes.
   - Run `npm run seed:admin` once, then remove `SEED_ADMIN_PASSWORD` from the host environment.
4. **Optional: enable the daily backup**
   - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID` to the backend service's environment. The in-process scheduler starts automatically on the next deploy.
   - Render's free tier **sleeps** when idle. The scheduler catches up on wake, but for a guaranteed 02:00 Asia/Kolkata run add a **Render Cron Job** (schedule `0 2 * * *`, timezone Asia/Kolkata) that calls `POST /api/admin/backup/cron` with the `x-backup-secret` header — see [Automatic daily Excel backup](#automatic-daily-excel-backup-to-google-drive).

### Rollback
- **Code** — On Render, use *Deploys → Rollback* to redeploy the previous successful build (or revert the commit and redeploy).
- **Unique index** — To reverse the mobile change, drop the `mobileNumber_1` unique index on `users`/`admins` in Atlas. Running the app without it removes the duplicate-number guarantee, so only do this if a bad index blocks writing.

## Testing checklist

### Automated — `cd backend && npm test`

Tests run with Node's built-in runner. Files run one at a time (`--test-concurrency=1`) because the DB-backed files share a single Atlas cluster; DB-backed tests connect to `TEST_MONGO_URI` and auto-skip when no database is reachable.

| # | Scenario | Covered by |
| --- | --- | --- |
| 1 | Mobile numbers are normalized to E.164 and validated | `phone.test.js` |
| 2 | Account mobile numbers are unique (409 on duplicates) | `mobileUniqueness.test.js` |
| 3 | The Excel round-trip download/preview/confirm still works | `excelTransfer.test.js` |
| 4 | The admin download workbook is exactly one `Family Records` sheet | `excelTransfer.test.js` |
| 5 | The backup workbook matches the download workbook (sheet, headers, column order, rows, family members) | `backup.test.js` |
| 6 | Repeated backups update the same Drive file; failures never report success; runs retry and cannot overlap | `backup.test.js` |
| 7 | The daily schedule is once per local day (Asia/Kolkata) and survives restarts | `backup.test.js` |
| 8 | The existing project UI builds cleanly | `cd admin-panel && npm run build` |

## Troubleshooting

**Excel round trip**

- **A preview shows unexpected additions** — additions are matched to existing records by `submissionId`. Rows without a matching id are treated as new; confirm the workbook came from the same database before applying.
- **The upload is rejected** — the import is limited to 5 MB and 5,000 records. Split larger files.

## Project Structure

```
project-root/
├── frontend/                 Public user-facing Vite + React app  → port 5173
│   ├── src/
│   │   ├── components/       MobileShell, StepDots, formPrimitives, FamilyMemberForm
│   │   ├── pages/            FamilyForm (7 steps), Review, Success
│   │   ├── services/         api.js (axios, no admin-token logic)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.cjs
│   └── vite.config.js
│
├── admin-panel/              Admin dashboard Vite + React app    → port 5174
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       StatCard, StatusBadge, EmptyState, LoadingState, ChartCard, Icons
│   │   │   ├── layout/       AdminHeader, AdminSidebar
│   │   │   ├── AdminLayout.jsx, ProtectedRoute.jsx
│   │   │   ├── ExcelImportDialog.jsx, FamilyEditForm.jsx
│   │   ├── pages/            AdminLogin, AdminDashboard, FamiliesTable, FamilyDetail,
│   │   │                     AdminAnalytics, AddAdmin, OccupationList, StudentsTable
│   │   ├── hooks/            useAuth
│   │   ├── services/         api.js (axios, JWT interceptor, 401 → /login)
│   │   ├── utils/            exportUtils (Excel/CSV/PDF)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.cjs
│   └── vite.config.js
│
├── backend/                  Express + MongoDB REST API          → port 5000
│   ├── config/               db.js (mongoose connect)
│   ├── controllers/          familyController.js, adminController.js, excelController.js,
│   │                         userController.js, backupController.js
│   ├── middleware/           auth.js (admin JWT + requireRole), userAuth.js, rateLimiter.js, errorHandler.js
│   ├── models/               Family.js, Admin.js, User.js, FamilyKey.js, BackupRun.js
│   ├── routes/               familyRoutes.js, adminRoutes.js, userRoutes.js, excelRoutes.js,
│   │                         backupRoutes.js
│   ├── services/
│   │   ├── excelTransfer.js          dashboard round-trip import/export
│   │   ├── familyExport.js           admin download workbook build
│   │   ├── familySheet.js            shared "Family Records" sheet builder
│   │   ├── familyWorkbook.js         shared workbook → XLSX Buffer (download + backup)
│   │   ├── familyRecordSerializer.js
│   │   ├── backupConfig.js           backup / Drive config from env
│   │   ├── backupService.js          generate → upload → verify → record
│   │   ├── backupScheduler.js        restart-safe daily scheduler (Asia/Kolkata)
│   │   ├── googleDrive.js            Google Drive v3 client (create/update/find/verify)
│   │   ├── mobileUniqueness.js       audit / normalize / create unique indexes
│   │   └── removeLegacyMobileNumberIndex.js
│   ├── scripts/              migrateMobileUniqueness.js
│   ├── test/                 phone.test.js, mobileUniqueness.test.js, excelTransfer.test.js,
│   │                         backup.test.js, helpers/db.js
│   ├── utils/                generateKey.js, phone.js (E.164)
│   ├── seed/                 seedAdmin.js, createTestKeys.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── .gitignore
└── README.md
```

## Notes & Intentional Simplifications

- Existing CSV/PDF and family-table exports remain unchanged. The dashboard round-trip Excel workbook is generated server-side; its import parser accepts `.xlsx` and `.xls`.
- The dashboard's round-trip workbook uses Mongo field paths as headers; `familyMembers` and `children.list` are JSON-array cells. The upload is limited to 5 MB and 5,000 records. Blank optional cells are ignored unless “Clear optional fields” is selected; omitted records are never deleted.
- The **"Edit Record"** button on the admin record detail is a visual placeholder matching the mockups. The backend endpoint `PUT /api/admin/families/:id` already exists and is fully functional — wire up an edit form on the frontend when you're ready.
- Admin roles are modeled (`superadmin`, `admin`, `viewer`). Role-gated today: `DELETE /api/admin/families/:id` (`admin`, `superadmin`). Extend `requireRole` onto `PUT` / `GET /export` etc. as your policy requires.
- Family Key gating (one unique key per submission) is implemented backend-side in the models and a seed script, but the admin key-generation UI hasn't been wired up. Use `node backend/seed/createTestKeys.js 5` or add a `POST /api/admin/keys` endpoint.
