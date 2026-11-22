# SkillSwap

A peer learning platform where students teach and learn from each other. Subjects like DSA and React, and skills like spoken English, guitar or swimming. You can teach, learn, or do both.

Live: https://skillswap-y4y4.onrender.com

## Features

- Search skills by exact topic (for example DSA → Graphs), with or without an account
- Book a one-to-one session in a time slot where both students are free
- Study Together: post a subject and study live with one partner
- Chat, WhatsApp and a meeting link (Meet, Zoom, Teams) after a session is accepted
- Match score with reasons, reviews, and a topic checklist for progress
- Report misuse, change password, delete account
- Admin panel: users, content, reports, site settings and an activity log

## Tech stack

MongoDB, Express, React (Vite), Node.js. Login with JWT, passwords hashed with bcrypt. One server serves both the API and the website.

## Run locally

Needs Node.js 18+ and MongoDB.

```bash
# API
cd server
npm install
cp .env.example .env     # set MONGO_URI and JWT_SECRET
npm run dev              # http://localhost:5000

# Website
cd client
npm install
npm run dev              # http://localhost:5173
```

Optional sample data: `npm run seed` in `server/` (development only).
Tests: with the server running, `npm test` in `server/`.

## Environment variables

| Variable | Notes |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string |
| `ADMIN_EMAILS` | Comma-separated emails that become admins |

## Deploy

`render.yaml` and a `Dockerfile` are included. Build with `npm run build`, start with `npm start`.

## Structure

```
server/src   models, routes, middleware, utils, scripts
client/src   pages, components
```
