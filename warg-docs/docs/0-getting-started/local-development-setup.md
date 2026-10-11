---
sidebar_position: 1
---

# Local Development Setup

This guide gets the full WARG Platform running on your machine. For production deployments, see the [Deployment Guide](../4-deployment/deployment-guide.md).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | CI runs Node 24 |
| MySQL | 8+ | A local instance, or an Aiven free plan |
| Git | any | |
| Python | 3.10+ | AI Engine only (optional) |

## 1. Backend (Express API)

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` — the minimum needed to boot is `DATABASE_URL` pointing at an empty MySQL database (Sequelize syncs the schema on start). `server/.env.example` documents every variable, including Google OAuth, the CORS allowlist, and the AI Engine keys.

```bash
npm run seed     # optional: idempotent Wits-campus demo data
npm run dev      # API on http://localhost:3000 (auto-restarts via --watch)
```

> **Note:** the running server reads `server/.env`. `seed.js` additionally loads `server/src/.env` first, so if you plan to seed, copy (or symlink) your `.env` there too.

## 2. Frontend (static client)

From a second terminal:

```bash
cd client
npm install      # first time only (installs http-server and Playwright)
npx http-server ./ -p 8080 -a 127.0.0.1
```

Open http://localhost:8080. `client/scripts/config.js` detects `localhost` and points the API at `http://localhost:3000` automatically.

## 3. Running the tests

```bash
# Backend (from server/)
npm run test:unit         # fast, no database
npm run test:mocked       # no database; loads server/.env.test
npm run test:integration  # requires a test database (DATABASE_URL from .env.test)

# Frontend (from client/) — Chromium is the supported local run
npx playwright test --project=chromium
```

## 4. Documentation site (this site)

```bash
cd warg-docs
npm install
npm run start -- --port 4000   # 4000 avoids the backend's :3000
```

## 5. AI Engine (optional)

The shape/colour matching microservice — only needed when working on minigames that call it. The backend reaches it via `AI_SERVICE_URL` (default `http://localhost:8000`).

```powershell
cd ai-engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
