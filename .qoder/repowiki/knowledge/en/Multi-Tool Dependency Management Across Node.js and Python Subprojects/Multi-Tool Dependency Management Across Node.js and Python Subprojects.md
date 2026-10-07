---
kind: dependency_management
name: Multi-Tool Dependency Management Across Node.js and Python Subprojects
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - server/package.json
    - client/package.json
    - warg-docs/package.json
    - ai-engine/requirements.txt
    - server/package-lock.json
    - client/package-lock.json
    - .gitea/workflows/ci.yml
---

## Approach

The WARG Platform monorepo manages dependencies with two separate package managers, one per language:

- **Node.js**: npm (lockfile v3) via `package.json` + `package-lock.json`, used in the root workspace, `server/`, `client/`, and `warg-docs/`.
- **Python**: pip-style `requirements.txt` in `ai-engine/`, with an extra PyTorch CPU wheel index.

There is no monorepo-level dependency orchestrator (no Lerna, pnpm workspaces, yarn workspaces, or Turborepo). Each subproject declares its own dependencies independently. The top-level `package.json` only pins shared Express/Passport runtime deps (`express-session`, `passport`, `passport-google-oauth20`) — it does not act as a workspace root.

## Key Files

- `package.json` — root-level shim; only three runtime deps shared conceptually across Node projects.
- `server/package.json` — backend manifest (Express, Sequelize, MySQL, Passport, Socket.io, bcryptjs, multer, cors, dotenv).
- `client/package.json` — frontend manifest; all deps are `devDependencies` (Playwright, ESLint, http-server, serve, monocart-reporter); the SPA itself has zero runtime JS dependencies.
- `warg-docs/package.json` — Docusaurus site manifest pinned to `@docusaurus/core` 3.10.2 / React 19, with an `engines.node >= 20.0` constraint.
- `ai-engine/requirements.txt` — Python manifest using `--extra-index-url https://download.pytorch.org/whl/cpu` plus torch/timm/opencv/pytesseract/MobileSAM.
- `server/package-lock.json`, `client/package-lock.json` — npm lockfiles (lockfileVersion 3) committed alongside manifests.
- `.gitea/workflows/ci.yml` — CI installs via `npm ci` with `cache-dependency-path: '**/package-lock.json'`.

## Architecture and Conventions

**Per-project isolation.** Each of the four Node.js subprojects (`server`, `client`, `warg-docs`, root) ships its own `package.json` and `package-lock.json`. There is no shared dependency graph between them — `server/node_modules` and `client/node_modules` are independent.

**Semantic version ranges.** All Node.js dependencies use caret ranges (`^x.y.z`), allowing minor/patch updates within the major version. The `warg-docs` project is the exception for some Docusaurus packages where exact versions are used (e.g. `"@docusaurus/core": "3.10.2"`).

**Lockfiles are committed.** Both `server/package-lock.json` and `client/package-lock.json` are tracked in git, ensuring reproducible installs in CI (`npm ci`).

**CI uses `npm ci`.** The Gitea workflow runs `npm ci` (not `npm install`) for both `./server` and `./client`, which enforces strict adherence to the lockfile and fails if it drifts from `package.json`.

**No vendoring of JS code.** Dependencies are installed into each project's `node_modules/`; there is no `vendor/`, `lib/`, or checked-in third-party source tree for Node packages.

**Python extras index.** `ai-engine/requirements.txt` adds `--extra-index-url https://download.pytorch.org/whl/cpu` before the normal PyPI index so that CPU-only wheels of PyTorch resolve first.

**Git URL dependency.** `ai-engine/requirements.txt` pulls MobileSAM directly from GitHub via `git+https://github.com/ChaoningZhang/MobileSAM.git` rather than a published PyPI release.

**Engine constraints.** `warg-docs/package.json` declares `"engines": { "node": ">=20.0" }`; the CI setup step pins Node 24 (`actions/setup-node@v4` with `node-version: '24'`).

## Rules and Constraints

- **Reproducible Node installs**: CI uses `npm ci` with `cache-dependency-path: '**/package-lock.json'` (`.gitea/workflows/ci.yml` lines 33-38), which requires the lockfile to match `package.json` exactly.
- **No private registry configured**: No `.npmrc`, `npmrc`, `PIP_INDEX_URL`, `PIP_EXTRA_INDEX_URL` (outside the requirements file), or `GOPRIVATE` was found; all packages resolve from public registries (npmjs.org, PyPI, GitHub).
- **No monorepo workspace tooling**: There is no `pnpm-workspace.yaml`, `lerna.json`, `turbo.json`, or equivalent — each subproject is managed independently by npm/pip.
- **Runtime vs dev separation**: The `client/` project puts every dependency under `devDependencies` because the SPA is pure HTML/CSS/JS served statically; the `server/` project separates runtime deps from test/lint dev deps similarly.