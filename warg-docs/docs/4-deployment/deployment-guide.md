---
sidebar_position: 1
---

# Deployment Guide

This document covers the full hosting setup for the WARG Platform across its three infrastructure layers:

| Layer | Service | Role |
|-------|---------|------|
| Database | [Aiven for MySQL](https://aiven.io) | Managed MySQL with spatial extensions & SSL |
| Backend | [Render](https://render.com) | Node.js / Express API server |
| AI Engine | [AWS Lightsail](https://aws.amazon.com/lightsail/) | Ubuntu Linux instance running Docker for ML models |
| Frontend | [Vercel](https://vercel.com) | Static HTML/CSS/JS client delivery |

### Architecture Overview

```mermaid
flowchart LR
    subgraph Client [Client Devices]
        Mobile[Mobile Devices]
        Desktop[Desktop Browsers]
    end

    subgraph Vercel [Vercel]
        Frontend[Static HTML/JS/CSS]
    end

    subgraph Render [Render]
        API[Node.js / Express API]
    end

    subgraph AWS [AWS Lightsail]
        Ubuntu[Ubuntu Linux]
        subgraph Docker [Docker Container]
            AIEngine[AI Engine - Python/FastAPI]
        end
        Ubuntu --- Docker
    end

    subgraph Aiven [Aiven]
        DB[(MySQL Spatial DB)]
    end

    Mobile -->|HTTPS| Frontend
    Desktop -->|HTTPS| Frontend
    
    Frontend -->|REST / WebSocket| API
    
    API -->|TCP/SSL| DB
    API -->|HTTPS| AIEngine
```

---

## Prerequisites

- A [Git-E](https://gitea.io) / GitHub / GitLab repository containing this codebase.
- Accounts created on [Aiven](https://aiven.io), [Render](https://render.com), and [Vercel](https://vercel.com).
- Node.js >= 18 installed locally for testing before deployment.

---

## 1. Aiven — MySQL Database

Aiven provides a fully managed MySQL service. The WARG platform uses MySQL's **spatial extensions** (SRID 4326 / WGS 84) to store ARG waypoints as `POINT`, `LINESTRING`, and `POLYGON` geometry types. Aiven enforces SSL on all connections, which is already handled in `server/src/config/database.js`.

### 1.1 Creating a MySQL Service

1. Log in to [console.aiven.io](https://console.aiven.io).
2. Click **Create service** → choose **MySQL**.
3. Select your preferred cloud provider and region (choose the region closest to your Render backend for low latency).
4. Choose a plan (the free-tier **Hobbyist** plan is sufficient for development).
5. Name the service (e.g., `warg-mysql`) and click **Create service**.
6. Wait for the service state to change to **Running** (typically 1–3 minutes).

### 1.2 Obtaining the Connection URI

1. From your service dashboard, open the **Overview** tab.
2. Under **Connection information**, locate the **Service URI**. It will look like:
   ```
   mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRE
   ```
3. Copy this full URI — this becomes your `DATABASE_URL` environment variable.

> **Note:** Aiven uses `defaultdb` as the default schema name. You can create a dedicated schema (e.g., `wargdb`) from the **Databases** tab if needed.

### 1.3 SSL Configuration

The Aiven MySQL service requires SSL. This is already configured in the database adapter:

```js
// server/src/config/database.js
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false   // Accepts Aiven's self-signed CA cert
  }
}
```

> **Security note for production:** Download the **CA Certificate** from the Aiven service dashboard and set `rejectUnauthorized: true`, passing the cert via the `ca` field. This validates the server identity and prevents MITM attacks.

### 1.4 Running Migrations / Seeding

After connecting, run Sequelize sync to initialise the schema:

```bash
# From the /server directory
node -e "const db = require('./src/config/database'); db.sync({ force: false }).then(() => { console.log('DB synced'); process.exit(0); })"
```

For a clean slate during development, use `force: true` (WARNING: **drops all tables**).

### 1.5 Monitoring & Backups

- Aiven performs **automated daily backups** with point-in-time recovery on paid plans.
- Monitor query performance from the **Metrics** tab in the Aiven console.
- Connection pool exhaustion is a common issue on the Hobbyist plan — keep Sequelize's `pool.max` at &lt;= 5.

---

## 2. Render — Backend Hosting

Render hosts the Node.js / Express backend (`/server`). It provides zero-downtime deploys, automatic HTTPS, and native environment variable management.

### 2.1 Creating a Web Service

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New** → **Web Service**.
3. Connect your Git provider and select the WARG Platform repository.
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `warg-backend` (or similar) |
   | **Region** | Closest to your Aiven MySQL region |
   | **Branch** | `main` (or your production branch) |
   | **Root Directory** | `server` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free (development) / Starter (production) |

5. Click **Create Web Service**.

### 2.2 Environment Variables

From the Render service dashboard, go to **Environment** and add the following variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your full Aiven MySQL URI (from §1.2) |
| `PORT` | `3000` (Render also injects its own `PORT`; Express reads from `process.env.PORT`) |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Long random string — **required**; the server refuses to start in production without it |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From your Google Cloud OAuth client (enables "Sign in with Google") |
| `GOOGLE_CALLBACK_URL` | Defaults to the relative path `/auth/google/callback`; only set it if your Google console requires an absolute URL |
| `CLIENT_URL` | Comma-separated frontend origins allowed by CORS **and** the OAuth redirect allowlist, e.g. `https://your-app.vercel.app,http://localhost:8080` |
| `CLIENT_PAGES_URL` | The Vercel origin used to build post-login redirect targets, e.g. `https://your-app.vercel.app` |

> **Full list:** see `server/.env.example` or the [Environment Variables Reference](#environment-variables-reference) below.

> **Tip:** Render also supports secret files (`.env` format) via **Secret Files** in the service settings if you prefer storing multiple variables in one place.

### 2.3 Auto-Deploy on Push

Render automatically redeploys whenever a commit is pushed to the configured branch. To disable this, toggle **Auto-Deploy** off in the service settings and trigger deploys manually.

### 2.4 Health Checks

Render pings a health-check endpoint to confirm the service is live. The API exposes one at `GET /health` (see `server/src/app.js`). It runs a lightweight `SELECT 1` against the database and reports the result:

```js
// Always 200 (Render treats non-2xx as a failed deploy); the `db` field carries state.
app.get('/health', async (req, res) => { ... res.status(200).json({ status: 'ok', db: 'up' | 'down' }); });
```

Configure the **Health Check Path** in Render's service settings to `/health`.

### 2.5 Keep-Alive (Free-Tier Spin-Down)

Render's free tier spins the web service down after ~15 minutes of inactivity, and Aiven's free plan puts the database to sleep as well — the first request after idle pays a cold-start of several seconds. Three mechanisms keep the stack warm, in order of reliability:

1. **In-app ping** — `client/scripts/config.js` fetches `/health` ~3 seconds after every page load and then every 10 minutes while a user session is open. This is active in production today.
2. **Server-side keep-alive** — `server/server.js` runs a `SELECT 1` every 10 minutes while the server is up, keeping the Aiven connection pool from going cold.
3. **Scheduled CI ping** — `.gitea/workflows/keepalive.yml` pings `/health` every 10 minutes. Note that scheduled workflows only run once the file is merged to the repository's **default branch**, and CI cron can be delayed — treat this as a backup, not the primary mechanism.

For guaranteed uptime, use an external uptime monitor (e.g. **UptimeRobot** or **cron-job.org**) hitting `https://<your-backend>.onrender.com/health` every 5 minutes — external pings are independent of CI queue delays and browser sessions. The definitive fix is upgrading Render to a paid plan (see §2.6), which disables spin-down entirely.

### 2.6 WebSocket Support (Socket.io)

The server initialises Socket.io, but it is currently only a connect/disconnect stub — no gameplay feature depends on live WebSocket traffic yet, so no WebSocket-specific configuration is required. If real-time features are added later, Render's free tier supports WebSockets on the same port as HTTP without additional configuration, and Socket.io's polling fallback also works out of the box.

> **Important:** Render's free-tier web services **spin down after 15 minutes of inactivity**. For WebSocket-dependent features, upgrade to at least the **Starter** plan to prevent connection drops during active gameplay sessions.

### 2.7 Viewing Logs

From the Render dashboard, select your service and click the **Logs** tab. Live streaming logs are available for real-time debugging. For production, consider forwarding logs to a service like Papertrail or Logtail via Render's **Log Streams** feature.

---

## 3. AWS Lightsail — AI Engine

The AI Engine for shape matching, texture matching, and visual validations is hosted on AWS Lightsail. It runs on an Ubuntu Linux instance and is containerised using Docker.

### 3.1 Instance Setup

1. Create an AWS Lightsail instance running **Ubuntu 22.04 LTS**.
2. Allocate a static IP address to the instance.
3. SSH into the instance and install Docker and Docker Compose.

### 3.2 Docker Deployment

The AI Engine is deployed as a Docker container, exposing a REST API via FastAPI.

```bash
# Clone the repository
git clone <repository_url> warg-ai-engine
cd warg-ai-engine

# Build and run the Docker container
docker-compose up -d --build
```

### 3.3 Network & Security Configuration

1. In the AWS Lightsail networking tab, ensure that HTTP (port 80) and HTTPS (port 443) are open.
2. Use an Nginx reverse proxy alongside Let's Encrypt (Certbot) to secure the API endpoint.
3. Restrict access to the API so that it only accepts requests coming from the Render Backend's IP addresses or by requiring an internal API key.

---

## 4. Vercel — Frontend Hosting

Vercel hosts the static HTML/CSS/JS client located in the `/client` directory. It provides global CDN delivery, automatic HTTPS, and preview deployments for every pull request.

### 4.1 Importing the Project

1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import the WARG Platform repository from your Git provider.
3. Configure the project:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | `Other` (plain static site) |
   | **Root Directory** | `client` |
   | **Build Command** | *(leave blank — no build step required)* |
   | **Output Directory** | `.` (the `client` folder itself is the output) |

4. Click **Deploy**.

### 4.2 Routing Static HTML Pages

The WARG frontend is a multi-page application (MPA) with individual `.html` files:

- `home.html` — Landing page & active ARG listing
- `game.html` — In-game geolocation & puzzle view
- `studio.html` — Creator studio for plotting ARG nodes
- `edit_warg.html` — ARG editing interface
- `catalogue.html` — Browse published ARGs
- `analytics.html` — Creator performance dashboards
- `admin.html` — Administrator oversight panel
- `user-profile.html` — Player profile
- `friend-profile.html` — Social following view

Vercel serves each file at its corresponding path by default (e.g., `https://your-app.vercel.app/game.html`).

To enable cleaner URLs (e.g., `/game` instead of `/game.html`), add a `vercel.json` file in the `client` directory:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

### 4.3 Connecting the Frontend to the Backend

After deploying to Render, your backend URL will look like:

```
https://warg-backend.onrender.com
```

The client resolves the API base automatically — no per-file `fetch()` edits are needed. `client/scripts/config.js` sets a single `window.API_BASE_URL`: it points to `http://localhost:3000` when the pages are served from `localhost`/`127.0.0.1`, and to the production Render URL otherwise. To repoint production at a different backend, change the constant in `client/scripts/config.js`.

### 4.4 Environment Variables (Vercel)

Vercel environment variables are designed for server-side rendering frameworks (Next.js, etc.). Since the WARG frontend is plain static HTML/JS with no build step, there is no environment variable injection at build time. All configuration (e.g., the API base URL) should be managed as JavaScript constants within the script files, or via a small shared `config.js` file served alongside the HTML.

### 4.5 Custom Domain

To attach a custom domain (e.g., `warg.wits.ac.za`):

1. Go to your Vercel project → **Settings** → **Domains**.
2. Add your domain and follow the DNS configuration instructions (typically a `CNAME` or `A` record).
3. Vercel automatically provisions and renews an SSL certificate via Let's Encrypt.

### 4.6 Preview Deployments

Every pull/merge request automatically gets a unique preview URL (e.g., `https://warg-platform-git-feature-branch.vercel.app`). This is useful for reviewing frontend changes without affecting the production deployment.

---

## Environment Variables Reference

All environment variables for the backend are defined in `server/.env.example`. Copy this file to `server/.env` for local development:

```bash
cp server/.env.example server/.env
```

Then fill in your actual Aiven credentials:

```env
PORT=3000
DATABASE_URL="mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRED"
NODE_ENV=development
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Full MySQL connection URI including credentials and SSL flag (`?ssl-mode=REQUIRED` for Aiven) |
| `PORT` | Optional | Defaults to `3000`; Render injects its own value automatically |
| `NODE_ENV` | Optional | Set to `production` on Render to suppress dev-only logging |
| `SESSION_SECRET` | Yes (production) | Signs session cookies; development falls back to an ephemeral secret, production refuses to start without it |
| `CLIENT_URL` | Yes (production) | Comma-separated frontend origins — controls CORS **and** the OAuth redirect allowlist |
| `CLIENT_PAGES_URL` | Recommended | Frontend origin used to build post-login redirect targets; falls back to the first `CLIENT_URL` entry |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google login | Registers the `/auth/google` strategy; without them only email/password login works |
| `GOOGLE_CALLBACK_URL` | Optional | Defaults to the relative `/auth/google/callback` |
| `AI_SERVICE_URL` | Optional | AI Engine base URL; defaults to `http://localhost:8000` |
| `AI_KEY` | Yes (production) | Shared secret for the AI Engine; development falls back to `dev-secret-key`, production refuses to start without it |
| `AI_API_KEY` | Optional | Key used when the minigame routes call the AI Engine; defaults to `dev-secret-key` |

> **Never commit your `.env` file.** It is listed in `.gitignore`. Use Render's **Environment** tab to manage secrets in production.
>
> **Local development:** see [Local Development Setup](../0-getting-started/local-development-setup.md) for creating `server/.env` from `.env.example`.

---

## Deployment Checklist

Use this checklist before every production release:

### Database (Aiven)
- [ ] Aiven service is in **Running** state
- [ ] `DATABASE_URL` has been copied from the Aiven console (Overview tab)
- [ ] Schema has been synced (`db.sync`)
- [ ] Spatial indexes are present on `POINT`, `LINESTRING`, and `POLYGON` columns

### Backend (Render)
- [ ] `DATABASE_URL` environment variable is set in Render's **Environment** tab
- [ ] `NODE_ENV=production` is set
- [ ] Root Directory is set to `server`
- [ ] Start Command is `npm start`
- [ ] `/health` endpoint returns `200 OK`
- [ ] WebSocket connections verified (if deploying live-play features)
- [ ] Render service is on a paid plan if WebSocket uptime is required

### Frontend (Vercel)
- [ ] `API_BASE_URL` in `client/scripts/config.js` points to the production Render URL
- [ ] Root Directory is set to `client`
- [ ] All HTML pages load correctly at their expected paths
- [ ] CORS is configured on the Express server to allow requests from the Vercel domain
- [ ] `vercel.json` is present in `client/` if clean URLs are desired

### CORS Configuration

Ensure the Express backend allows requests from the Vercel frontend domain. CORS is driven by the `CLIENT_URL` environment variable (comma-separated origins) in `server/src/app.js`:

```js
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

// Additionally, outside production any http://localhost / http://127.0.0.1 origin is allowed.
app.use(cors({ origin: corsOriginCheck, credentials: true }));
```

Set `CLIENT_URL` to include `https://your-app.vercel.app` (plus `http://localhost:8080` for local development).
