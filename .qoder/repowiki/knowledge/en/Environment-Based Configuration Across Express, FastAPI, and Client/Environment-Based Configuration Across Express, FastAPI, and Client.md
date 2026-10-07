---
kind: configuration_system
name: Environment-Based Configuration Across Express, FastAPI, and Client
category: configuration_system
scope:
    - '**'
source_files:
    - server/src/app.js
    - server/src/config/database.js
    - server/src/config/passport.js
    - server/src/.env
    - server/.env
    - server/tests/setup/loadEnv.js
    - client/scripts/config.js
    - ai-engine/main.py
    - ai-engine/Dockerfile
    - vercel.json
---

# Configuration System

## Approach
The monorepo uses a flat **`.env` + `dotenv`** configuration strategy with no schema validation layer. Each runtime component loads its own environment variables directly from `process.env` / `os.getenv`, with defaults applied inline where a value is optional.

There are three distinct configuration surfaces:
- **Server (Express)** — `server/src/.env` and `server/.env`
- **AI Engine (FastAPI)** — `ai-engine/Dockerfile` `ENV` directives + runtime env vars
- **Client SPA** — hostname-based branching in `client/scripts/config.js`

## Key Files
- `server/src/app.js` — central app factory; reads `SESSION_SECRET`, `CLIENT_URL`, `NODE_ENV`, `DATABASE_URL`
- `server/src/config/database.js` — Sequelize connection; strips `?ssl-mode=REQUIRED` suffix, toggles SSL via `NODE_ENV`
- `server/src/config/passport.js` — conditionally registers Google OAuth only when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set
- `server/src/.env` — database URL, Google OAuth credentials, session secret, CORS origins, client page URL
- `server/.env` — duplicate of the above plus `PORT=3000` and comments documenting production values
- `server/tests/setup/loadEnv.js` — explicitly loads `server/.env.test` for Jest runs
- `client/scripts/config.js` — sets `window.API_BASE_URL` based on `window.location.hostname` (`localhost` → `http://localhost:3000`, else `https://wargmirror.onrender.com`)
- `ai-engine/main.py` — reads `AI_KEY` (default `"dev-secret-key"`) for `X-API-Key` header auth; hardcodes CORS allow-list
- `ai-engine/Dockerfile` — sets `ENV PORT=8080`, `PYTHONUNBUFFERED=1`, `PYTHONDONTWRITEBYTECODE=1`
- `vercel.json` — rewrites static client assets under `/client/*` at the Vercel edge

## Architecture & Conventions

### Environment variable loading
Every Node entry point calls `require('dotenv').config()` before reading env vars:
- `server/src/app.js` line 4
- `server/src/config/database.js` line 2
- `server/tests/setup/loadEnv.js` calls `dotenv.config({ path: ... })` against `.env.test`

The Python AI engine uses `os.getenv("AI_KEY", "dev-secret-key")` — no dotenv file is used there; secrets are expected to be injected by the container orchestrator.

### Environment-specific behavior
Behavior branches on `process.env.NODE_ENV`:
- `database.js`: when `NODE_ENV === 'test'`, `dialectOptions` is `{}` (no SSL); otherwise SSL is enabled with `rejectUnauthorized: false` (Aiven MySQL).
- `app.js`: session store switches between `express-mysql-session` (production/dev) and in-memory store (`NODE_ENV === 'test'`).
- `passport.js`: Google OAuth strategy is registered only if both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` exist; otherwise it logs a warning and the server still starts.

### Secrets handling
- Database URL, Google OAuth keys, and session secret live in `server/src/.env` and `server/.env` (both committed in this snapshot — see below).
- The AI engine's API key defaults to the literal string `"dev-secret-key"` when `AI_KEY` is unset.
- There is no `.gitignore` rule shown that excludes `.env` files from version control in this snapshot.

### Frontend configuration
The client has no build step or config loader. `client/scripts/config.js` determines the backend base URL purely from `window.location.hostname`:
- `localhost` / `127.0.0.1` → `http://localhost:3000`
- Everything else → `https://wargmirror.onrender.com`
It also registers the service worker (`sw.js`) unconditionally.

### Deployment wiring
- `vercel.json` rewrites all routes to serve static HTML/JS/CSS from the `client/` directory, so the Express server is not behind Vercel — the frontend is served statically while the backend lives on Render (`https://wargmirror.onrender.com`).
- The AI engine Dockerfile exposes port 8080 and runs `uvicorn main:app --host 0.0.0.0 --port ${PORT}`, expecting `PORT` to be supplied by Cloud Run / Lightsail.

## Conventions and Constraints

1. **All Node configuration comes from `process.env` loaded via `dotenv`** — no JSON/YAML/TOML config files are parsed by application code.
2. **Optional features gate on env presence**: Google OAuth is disabled silently when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are missing; the server still boots.
3. **Test isolation**: tests load their own `.env.test` via `server/tests/setup/loadEnv.js`; they do not share the development `.env`.
4. **CORS origin policy**: `CLIENT_URL` is a comma-separated list of allowed origins; `app.js` normalizes them by trimming whitespace and stripping trailing slashes. Local development (`NODE_ENV !== 'production'` + `http://localhost*`) is always whitelisted regardless of `CLIENT_URL`.
5. **Session cookie security**: `secure` and `sameSite` are set to `'none'` only when `NODE_ENV === 'production'`; otherwise cookies use `lax` and are not marked secure.
6. **Database connection**: `DATABASE_URL` must include `?ssl-mode=REQUIRED` (stripped before passing to Sequelize); non-test environments connect with `ssl.rejectUnauthorized: false`.
7. **AI engine authentication**: every endpoint requires the `X-API-Key` header matching `AI_KEY`; the default fallback is the plaintext string `"dev-secret-key"`.
8. **Frontend backend address is host-derived**: the client never reads an env var — it infers the backend URL from the browser's hostname, which couples deployment URLs to runtime behavior.