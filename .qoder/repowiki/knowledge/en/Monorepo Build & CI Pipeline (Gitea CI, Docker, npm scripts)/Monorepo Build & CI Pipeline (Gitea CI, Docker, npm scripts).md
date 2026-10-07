---
kind: build_system
name: Monorepo Build & CI Pipeline (Gitea CI, Docker, npm scripts)
category: build_system
scope:
    - '**'
source_files:
    - .gitea/workflows/ci.yml
    - vercel.json
    - ai-engine/Dockerfile
    - ai-engine/requirements.txt
    - server/package.json
    - server/jest.config.js
    - client/playwright.config.ts
    - client/package.json
    - warg-docs/package.json
---

## What system/approach is used

The WARG Platform monorepo uses a **per-package build approach** orchestrated by a single Gitea CI workflow. There is no top-level Makefile or npm workspaces setup — each subproject (`server`, `client`, `ai-engine`, `warg-docs`) manages its own dependencies and scripts via its own `package.json` / `requirements.txt`. Containerization is provided only for the AI vision service through a dedicated `Dockerfile`; the Express server and static client are served directly from Vercel.

CI runs on `ubuntu-latest` with Node.js 24 and a MySQL 8.0 sidecar container. The pipeline executes linting and tests across the backend and frontend; it does not build or deploy artifacts.

## Key files and packages

- `.gitea/workflows/ci.yml` — single CI entry point defining the test matrix.
- `vercel.json` — Vercel rewrites that route `/` to `client/home.html` and proxy static assets under `/styles|scripts|assets|test-results|tests|node_modules/` into the `client/` directory.
- `ai-engine/Dockerfile` — multi-stage-free Python image based on `python:3.11-slim`, installs CPU-only PyTorch + OpenCV headless + Tesseract OCR, exposes port 8080, launches via `uvicorn main:app`.
- `ai-engine/requirements.txt` — pins FastAPI, uvicorn, opencv-python-headless, torch>=2.0.0, torchvision>=0.15.2, timm, MobileSAM (git+), pytesseract.
- `server/package.json` — defines `start`, `dev` (with `--watch-path`), `seed`, `lint`, `test:unit`, `test:mocked`, `test:integration`, and aggregate `test` scripts.
- `server/jest.config.js` — three Jest projects (`mocked`, `unit`, `integration`) with separate `testMatch` patterns and global setup/teardown only for integration.
- `client/playwright.config.ts` — Playwright config running Chromium/Firefox/WebKit against an `http-server` on `127.0.0.1:8080`, with Monocart coverage reporter writing to `coverage-reports/index.html`.
- `client/package.json` — only `test:ui` (Playwright) and `lint` (ESLint); no build step since the client is plain HTML/CSS/JS.
- `warg-docs/package.json` — Docusaurus 3.10.2 site with standard `build`/`serve`/`deploy` scripts; requires Node >= 20.

## Architecture and conventions

### Per-project dependency management
Each workspace root has its own lockfile (`package-lock.json` in `server/`, `client/`, `warg-docs/`) and its own dependency manifest. The CI caches `npm` using `cache-dependency-path: '**/package-lock.json'`, so every project's lockfile participates in cache invalidation independently.

### Test stratification in the backend
Jest is configured as three separate projects:
- `mocked`: model/controller/route/config tests under `tests/{models,controllers,routes,config}` — no DB, no global setup.
- `unit`: tests under `tests/unit/**` — also DB-less.
- `integration`: tests under `tests/integration/**` — uses `globalSetup`/`globalTeardown` and a real MySQL instance.
Scripts `test:unit`, `test:mocked`, and `test:integration` select each project individually; `npm test` runs all three in sequence.

### Frontend E2E testing
Playwright runs against a local `http-server` serving the raw `client/` directory at `127.0.0.1:8080`. Tests match `*.spec.(js|ts)` under `client/tests/`, run fully parallel locally but serially (`workers: 1`) on CI, with retries=2 on CI. Coverage is collected via Monocart and filtered to `scripts/` and `components/` source paths.

### Containerization scope
Only `ai-engine/` is containerized. The Dockerfile uses `python:3.11-slim`, sets `PYTHONUNBUFFERED=1` and `PYTHONDONTWRITEBYTECODE=1`, installs `libgl1`, `libglib2.0-0`, `tesseract-ocr`, and `tesseract-ocr-eng` for headless OpenCV + OCR, then copies `main.py`, `vision/`, and `weights/`. It targets Google Cloud Run / AWS Lightsail with a minimum of 1 GB RAM (recommended 2 GB).

### Deployment surface
Vercel hosts the static client and docs site. `vercel.json` rewrites `/` → `/client/home.html` and maps asset prefixes (`/styles`, `/scripts`, `/assets`, `/test-results`, `/tests`, `/node_modules`) into the `client/` subtree. No deployment step exists in CI — the workflow stops after tests pass.

## Conventions and constraints

- **CI triggers**: The Gitea workflow runs on push and pull_request events targeting the `main` branch only (`.gitea/workflows/ci.yml`).
- **Node version**: CI explicitly sets Node.js 24 via `actions/setup-node@v4` with `node-version: '24'`.
- **Database fixture in CI**: A MySQL 8.0 service container is started with `MYSQL_ROOT_PASSWORD=root`, `MYSQL_DATABASE=warg_test`, `MYSQL_USER=warg_test`, `MYSQL_PASSWORD=warg_test_pw`, exposed on port 3306, with a health check using `mysqladmin ping`.
- **Backend env in CI**: Integration tests require `NODE_ENV=test`, `DATABASE_URL=mysql://warg_test:warg_test_pw@127.0.0.1:3306/warg_test`, and `SESSION_SECRET=ci-test-secret`.
- **Frontend base URL**: Playwright expects the SPA at `baseURL: 'http://127.0.0.1:8080'` and starts `http-server ./ -p 8080 -a 127.0.0.1 -s` before running tests.
- **AI engine runtime**: The AI service listens on `$PORT` (default 8080) via `uvicorn main:app --host 0.0.0.0 --port ${PORT}`, intended for cloud-run-style environment injection.
- **No top-level build script**: There is no `Makefile`, no root `package.json` scripts orchestrating the whole repo, and no release/tagging automation in this branch — the CI is test-only.