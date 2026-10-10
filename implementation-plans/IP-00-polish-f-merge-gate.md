# IP-00 — Polish-F Final Merge Gate

**Register item:** MISSING_ITEMS.md §2 (Final merge gate for Polish-F)
**Type:** Process gate (review + verification + PR). No feature code is written in this step.
**Effort:** 1–2 hours plus CI wait.
**Blocking:** Yes — every other plan assumes Polish-F is merged. Do this first.

## 1. What is missing and why it matters for scoring

All security fixes, test fixes and documentation corrections made by the teammate exist only on the local branch `feet-/Polish-F` (commit `079b98c`). They are worth the bulk of the regained marks (SQL injection fix, geofence-bypass closure, authenticated flagging, current-password verification, POST logout, error-leak removal, Vercel test-path closure, CI `test:mocked`, placeholder spec replacement, honest docs). Until the branch is reviewed and merged through a PR with green CI, none of it counts — and `main` still ships the vulnerable code. Merging without review risks landing a regression that costs more marks than the branch recovers.

## 2. Subtasks

### 2.1 Diff review (do this locally, line by line, on the riskiest files)

```powershell
git fetch --all
git diff main...feet-/Polish-F --stat
git diff main...feet-/Polish-F -- server/src/controllers/gameController.js server/src/routes/argRoutes.js server/src/controllers/argController.js server/src/controllers/authController.js server/src/routes/authRoutes.js server/src/app.js
```

Checklist — confirm each against the diff:

- [ ] `server/src/routes/argRoutes.js`: `POST /:id/flag` is behind `requireAuth`; the controller (`argController.flagArg`) takes `reporter_id` from `req.user.user_id`, and no client body field can override it.
- [ ] `server/src/controllers/gameController.js` `dominationPing`: accepts only finite in-range JSON numbers for lat/lng, rejects strings/out-of-range with 400, and builds the WKT point only after validation and passes it as a bound query parameter (`:point_wkt` replacement), never interpolated.
- [ ] `gameController.submitMinigame` (and any other handler): `geofence_override` is honoured only when `NODE_ENV !== 'production'`; `client/scripts/game.js` no longer shows/sends the Dev Override dialog.
- [ ] `server/src/controllers/authController.js` `updateAccount`: verifies `current_password` (bcrypt) before changing the password.
- [ ] `authRoutes.js`: logout is `POST`; no `GET` logout remains. New `POST /forgot` and `POST /reset` exist.
- [ ] `argController.createArg` and other 500 handlers: no `error.message` returned to the client.
- [ ] Root `vercel.json`: the rewrite covering `tests|test-results|node_modules` is gone; rewrites for `/styles`, `/scripts`, `/assets` remain.
- [ ] `server/src/app.js`: `GET /health` returns `{ status: 'ok' }`.
- [ ] No secrets, tokens, `.env` values, or teammate-only local paths are introduced.

### 2.2 Required verification (record outputs before merging)

From a clean worktree on `feet-/Polish-F`:

```powershell
cd server
npm run lint
npm run test:mocked
npm run test:unit
npm run test:integration      # uses server/.env.test -> warg_test DB only

cd ..\client
npm run lint
npx playwright test --reporter=json
```

- [ ] All server suites pass (mocked + unit + integration). If integration fails for environment reasons (Aiven `warg_test` unreachable), retry; do not skip silently.
- [ ] Playwright passes with a plain/JSON reporter. Run the Monocart coverage variant separately only if coverage numbers are needed — previous Firefox timeouts under the coverage reporter must not be reported as product failures.
- [ ] `cd warg-docs; npm ci; npm run build` exits 0.

### 2.3 Open and merge the PR

- [ ] Push `feet-/Polish-F` and open a PR into `main` titled e.g. `Polish-F: security fixes, test suite completion, honest docs`.
- [ ] Require the Gitea CI checks (`.gitea/workflows/ci.yml`) to pass on the PR.
- [ ] Merge only after review approval + green CI. Use a merge commit (matches repo history).
- [ ] After merge, on `main`, re-run the safe live probes:
  - `GET https://wargmirror.onrender.com/health` → 200 `{ "status": "ok" }` (may take ~30 s cold start).
  - `POST https://wargmirror.onrender.com/api/args/1/flag` with empty body, no auth → **401** (previously 400).
  - `GET https://warg-mirror.vercel.app/tests/game.spec.js` → **404** (previously 200).
  - `GET https://wargmirror.onrender.com/api/args` → still 200; note the payload size (P1-4 fixes it next).

## 3. Acceptance criteria

- Polish-F is merged into `main` via a reviewed PR with green CI.
- All four live probes above behave as specified.
- `git log --oneline main` shows the merge; `main` is the base for all subsequent `feet/IP-*` branches.

## 4. Verification without breaking existing functionality

- The full §2.2 command set is the regression net — run it before merging, not after.
- Live probes are read-only or deliberately rejected writes (the flag probe returns 401 before any write). No database content changes.
- Rollback: if anything fails post-merge, `git revert -m 1 <merge-sha>` restores `main` instantly; the branch remains for re-work.

## 5. Safety notes

- Do not run any seed/migration script against production during this gate.
- Do not rebase Polish-F after the PR is open (force-push would invalidate review); add fixup commits instead.
