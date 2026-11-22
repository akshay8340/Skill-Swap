# SkillSwap: Peer Learning for Students

Students learn from each other: subjects like DSA and React, and also spoken English, Hindi, guitar, swimming or gymnastics. You can teach, learn, or both. Swapping is never required.
Built with the **MERN** stack (MongoDB, Express, React, Node.js). One server serves both the API and the website, so it deploys as a single service.

## Features

**For students**

| Feature | How it works |
|---|---|
| Browse without an account | Landing page, Explore and teacher profiles are open. Guests see shortened names ("Riya S."), no bios or wishlists. Booking and everything personal needs a login, and after logging in you return to the page you were on. |
| Skills with topics | A teacher lists topics under a skill (DSA → Dynamic Programming, Graphs). Search finds skills by topic, and a learner books one exact topic. |
| Study Together (1-to-1) | Post "I want to study DSA: Binary Search, DP". Another student joins you for a live session. |
| Free / Paid label | Shown only on the teacher's profile / booking page, never in lists (enforced in the API). No payment handling. |
| Video calls | Either person adds a meeting link once a session is accepted: a **Create Google Meet** button opens meet.google.com/new, then you paste the link back. Zoom, Teams, JioMeet, Webex and Whereby links work too. Only services the admins allow are accepted. |
| Contact after approval | In-app **chat**, and an optional **WhatsApp** button if the other person added a number. Numbers never appear publicly or before approval. |
| Suggestions, scheduling, ratings, progress | Match score, common free slots, double-booking prevention, two-way reviews, topic checklists. |
| Safety and account | **Report** a profile, study request or review. Change password. Delete your account (removes your data). |

**For administrators** (`/admin`)

| Section | What you can do |
|---|---|
| Overview | Totals, signups and session trends, most-taught skills, recent signups, open reports. One-click **Remove demo data**. |
| Users | Search and filter. Suspend/reactivate (takes effect immediately, even for logged-in users), make or remove admin, issue a temporary password (no email service needed), delete a user with all their data. Guards prevent locking yourself out or removing the last admin. |
| Content | Remove skills, close/delete study requests, delete reviews (ratings recalculate). |
| Reports | Review what students reported, with a preview. Suspend the user / delete the item and resolve in one click, or dismiss. |
| Settings | Edit everything that used to be hardcoded: skill categories, programmes, departments (with short names), allowed meeting services, topic suggestions, allowed signup email domains, and a site-wide announcement banner. Changes apply without redeploying. |
| Activity | A log of every admin action. |

## Where data lives

Everything is stored in **MongoDB** (database `skillswap`). Only the Express server touches it; the website talks to the API.

| Collection | Contents |
|---|---|
| `users` | profile, password **hash**, role, status, skills (+topics, fee label), wishlist, free time, WhatsApp |
| `sessions`, `messages` | bookings and their chats |
| `reviews`, `progresses`, `studyposts` | ratings, topic checklists, study requests |
| `reports`, `adminlogs` | moderation queue and the admin audit trail |
| `configs` | one document with the admin-editable settings (created from defaults on first start) |

The browser keeps only the login token. Video calls happen on the service you link; nothing from them is stored.

## Demo data vs real data

There are **no built-in users**. The site starts empty.
- `npm run seed` (development only) adds sample students, all flagged `isDemo`. It only ever replaces earlier demo data, never real accounts, and refuses to run when `NODE_ENV=production`.
- Remove demo data any time: **Admin → Overview → Remove demo data**, or `npm run clear-demo`. Real accounts are untouched.

## Run locally

Prerequisites: Node.js 18+ and MongoDB running locally (or an Atlas URI).

```powershell
# terminal 1 - API
cd server
npm install
copy .env.example .env      # then edit if needed
npm run dev                 # http://localhost:5000

# terminal 2 - frontend
cd client
npm install
npm run dev                 # http://localhost:5173
```

**First administrator.** Register normally on the site, then either run
`npm run make-admin -- you@example.com` (in `server/`), or put your email in `ADMIN_EMAILS` in `.env` and restart the server. Then open `/admin`.

**Optional sample data:** `npm run seed`, then log in as `demo@bitmesra.ac.in` / `password123`.

**Tests:** with the server running, `cd server && npm test` runs the end-to-end API checks (129). To include the admin checks, start the server with `ADMIN_EMAILS=admin-test@example.com`. The test deletes the accounts it creates. Use `set API=https://your-site/api` to test a deployed server.

## Deploy (one service, one URL)

You need a MongoDB database and a host.

### 1. Database: MongoDB Atlas (free)
1. Create a free cluster at mongodb.com/atlas, then **Database Access** → add a user with a password.
2. **Network Access** → add `0.0.0.0/0` (hosts like Render use changing IPs).
3. **Connect → Drivers** → copy the connection string and add the database name:
   `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/skillswap?retryWrites=true&w=majority`

### 2a. Render (easiest)
1. Push this folder to GitHub.
2. Render → **New → Blueprint** → pick the repository (`render.yaml` is used).
3. Paste `MONGO_URI`, and set `ADMIN_EMAILS` to **your own email**. `JWT_SECRET` is generated.
4. Deploy, open the URL, **register with that email**, and you are the administrator (`/admin`).

Free-tier note: Render free services sleep when idle, so the first visit after a break takes about a minute.

### 2b. Docker (Railway, Fly.io, Cloud Run, any VPS)
```bash
docker build -t skillswap .
docker run -p 5000:5000 -e MONGO_URI="..." -e JWT_SECRET="<32+ random chars>" -e ADMIN_EMAILS="you@example.com" skillswap
```
Railway can also deploy from the repo: build `npm run build`, start `npm start`.

### 2c. Any Node server / VPS
```bash
npm run build
NODE_ENV=production JWT_SECRET=... MONGO_URI=... ADMIN_EMAILS=you@example.com PORT=5000 npm start
```
Put Nginx or Caddy in front for HTTPS.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | yes | Atlas or any MongoDB URL |
| `JWT_SECRET` | yes | 16+ random chars. Production refuses weak/placeholder values. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAILS` | recommended | Comma-separated. These accounts are administrators (applied at signup, login and startup). More admins can be added from the admin panel. |
| `NODE_ENV` | recommended | `production` enables rate limits and strict checks |
| `PORT` | no | Hosts set this |
| `ALLOWED_EMAIL_DOMAIN` | no | Initial value only. After the first start, manage **Sign-up** domains in Admin → Settings |
| `CORS_ORIGIN` | no | Only if the frontend is on a different domain (build the client with `VITE_API_URL`) |

### After deploying
- `/api/health` → `{"ok":true,"db":"connected"}`.
- Register with your `ADMIN_EMAILS` address, open `/admin → Settings`, and adjust categories, programmes, departments and meeting services to your community.
- A new deployment starts **empty**. Never run the seed in production.
- Back up the database (Atlas backups, or `mongodump`).

### What production mode adds
Security headers (helmet with a CSP allowing only this site and Google Fonts), gzip, rate limits on failed logins and signups (shared campus IPs are not locked out by successful logins), a per-user chat flood limit, startup config validation, graceful shutdown, a health endpoint, and long-lived caching for hashed build files.

## Structure

```
server/src
  models/      User, Session, Message, Review, Progress, StudyPost, Report, AdminLog, Config
  routes/      auth, users, matches, discover, study, sessions, messages, reviews, progress, reports, config, admin
  middleware/  auth.js (login, optional login, admin guard, suspension, name masking)
  utils/       config.js (DB-backed settings) · cascade.js · meeting.js · admins.js · matching.js
  scripts/     make-admin.js · clear-demo.js        seed.js · smoke.test.js · constants.js (first-run defaults)
client/src
  pages/       Landing, Auth, Dashboard, Explore, UserProfile, Sessions, Progress, Profile, admin/*
  components/  Navbar, Chat, ReportButton, AccountSettings, Avatar, Icons, Stars, SlotPicker, TopicInput
  ConfigContext.jsx  loads the admin-managed settings from the server
Dockerfile · render.yaml · package.json (root build/start scripts)
```

## Known limitations

- **Emails are not verified and there is no "forgot password" email.** Admins can issue a temporary password from Admin → Users. Adding an email service (SMTP) for verification and resets is the next step as the community grows.
- Google Meet links cannot be generated automatically without connecting a Google account (OAuth credentials); the "Create Google Meet" button plus paste is the practical alternative.
- Chat refreshes every 5 seconds (no websockets, no unread badges or notifications).
- Fees and payments are outside the app. There is no block feature yet, only reporting.
- Times use the browser/server timezone. "Mark completed" is allowed any time after acceptance.
- Free hosting tiers sleep when idle.
