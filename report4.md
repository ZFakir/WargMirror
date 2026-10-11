# WARG Platform — Milestone 4 Lecturer-Style Assessment

**Course:** COMS3011A Software Design Project
**Milestone:** 4 — Final Project Submission
**Commit assessed:** `main` @ `0beaf22` — *Merge pull request 'test/--Most-Recent-Additions' (#66)*
**Previous evaluation referenced:** `FUCK.md` (assessed at `fbd10ba`, scored **57.75 / 100**)
**Assessment method:** Read-only review of the repository (code, configuration, docs, git history) against the Milestone 4 rubric and the brief's key requirements. No tracked files in the repository were modified.

---

## 1. Overall Verdict

### Estimated mark: **66.5 / 100** (before any penalty for missing key requirements)

> *"This is an ambitious project, with considerably more engineering in it than most groups attempt: a separate computer-vision microservice, offline play with background sync, anti-spoofing, and creator analytics. The team clearly took the previous round of security feedback seriously. However, I found three security holes in code you would demo, two items from the brief's key requirements are missing, and several numbers in your documentation don't match what the repository shows. That last point costs you more than you think: I mark what I can see, not what you tell me."*

| Category | Weight | Mark |
|---|---|---|
| Database | 10 | 7.25 |
| API | 25 | 16.00 |
| App | 42 | 29.25 |
| Misc | 23 | 14.00 |
| **Total** | **100** | **66.50** |

**Change since FUCK.md:** +8.75 (57.75 → 66.5), driven by real fixes in security, offline support, analytics, and repository hygiene.

---

## 2. Key Requirements Compliance (from the brief)

| Requirement | Status | Evidence |
|---|---|---|
| Version control + CI/CD | ✅ Pass | Gitea Actions (`.gitea/workflows/ci.yml`), 38 merged PRs |
| Non-monolithic front end / back end | ✅ Pass | `client/` (Vercel), `server/` (Render), `ai-engine/` (Docker on Lightsail) |
| Hand-written API | ✅ Pass | Express routes and controllers in `server/src` |
| Sign up / sign in | ✅ Pass | Passport (Google OAuth and local), `authController.signup` |
| Delete account | ✅ Pass | `DELETE /auth/account` → `authController.deleteAccount` |
| **Reset password** | ❌ **MISSING** | `client/login.html` has `<a href="#">Forgot password?</a>`, a dead link. The server has no forgot or reset route. |
| External API integration | ✅ Pass | Google OAuth, DiceBear avatars, the AI engine |
| Public documentation site (static hosting) | ✅ Pass (deployment assumed) | Docusaurus in `warg-docs/` with `wrangler.jsonc` (Cloudflare) |
| **AI usage attribution** | ❌ **MISSING** | Searched every `.md` in the repo for ChatGPT, Claude, Copilot, Gemini, LLM, "AI usage" and attribution. No matches. |
| Responsiveness and accessibility | ⚠️ Partial | See Section 3.3 |

> **Lecturer note:** a missing key requirement is not only a deduction under "Features". It may carry a separate penalty or cap the mark. These two items are the highest-priority fixes.

---

## 3. Criterion-by-Criterion Marking

### 3.1 Database — 7.25 / 10

| Criterion | Weight | Mark | Justification |
|---|---|---|---|
| Data | 3 | 1.5 | A seed script (`server/seed.js`) exists. Real user and ARG data in production could not be confirmed. |
| Deployment | 2 | 2.0 | Managed MySQL 8 on Aiven. |
| Structure | 5 | 3.75 | 21 tables, 3 views, SRID 4326 spatial columns, foreign keys. The schema now matches the models (`password_hash`, `auth_provider`, `is_suspended`, `suspended_until`), which is fixed since FUCK.md. **Deductions:** no migration tool (ad-hoc `migrate_*.js` / `alter_enum.js` scripts), avatars stored as `MEDIUMBLOB`, and no triggers or constraints for derived state. |

### 3.2 API — 16 / 25

| Criterion | Weight | Mark | Justification |
|---|---|---|---|
| Availability | 3 | 2.0 | Render free tier, so cold starts. There is no `/health` endpoint, although the deployment guide lists one. |
| Architecture | 5 | 3.5 | Routes, controllers, middleware and models are cleanly layered. `requireAuth` and `requireAdmin` are consolidated, and `requireAuth` blocks suspended users. **Deductions:** no validation layer, no central error-handling middleware, the duplicate non-transactional `POST /api/sessions/start` (it duplicates `/api/game/:argId/start`), and Socket.io is a connect/disconnect stub. |
| Deployment | 2 | 2.0 | Render, plus the Dockerised FastAPI AI engine on Lightsail protected by `X-API-Key`. |
| Performance | 5 | 2.5 | N+1 queries in `evaluateConditions`. No pagination apart from `limit: 20` on analytics flags. `express.json({ limit: '50mb' })`. No rate limiting and no helmet. |
| Design | 10 | 6.0 | The REST resources are sensible overall, but there are serious defects (below). |

#### API design and security defects

1. **SQL injection in `dominationPing`.** In `server/src/controllers/gameController.js` (around L486–514) the only check is `!lat || !lng || !game_id`, and then the values go straight into the query:
   ```js
   ST_GeomFromText('POINT(${lat} ${lng})', 4326)
   ```
   Any authenticated user can exploit this. The same bug was fixed in `arriveAtWaypoint` (which now uses `Number.isFinite` and range checks) but was reintroduced here.
2. **Any client can bypass the geofence.** `submitMinigame` passes `gps_proximity` whenever `geofence_override === true`. `client/scripts/game.js` (L583–595, L669) sends it after a `confirm("...Proceed anyway (Dev Override)?")` dialog. The code is commented *"TEMP … remove/gate before release"*, and this is the release. It defeats the core premise of a location-based game.
3. **`POST /api/args/:id/flag` has no authentication.** `argController.flagArg` trusts `req.body.reporter_id`. `client/scripts/api.js` defines `flagArg(argId, reason, description, reporterId = 1)` and `FlagModal.js` calls it without a reporter id, so **every flag is attributed to user 1**.
4. `GET /auth/logout` changes state on a GET request.
5. `updateAccount` changes the password without verifying the current one.
6. `createArg` leaks internal errors to the client: `detail: error.message`.
7. No API versioning, and error response shapes are inconsistent across controllers.
8. Dead code: `getGameState` still has a `req.query.user_id || 1` fallback, which `requireAuth` makes unreachable but which shows the code wasn't cleaned up.

### 3.3 App — 29.25 / 42

| Criterion | Weight | Mark | Justification |
|---|---|---|---|
| Accessibility | 5 | 3.0 | All pages set `lang`, and the main pages have 38–92 `aria-*` attributes each. **Deductions:** `login.html` and `signup.html` have **zero** `aria-*` attributes, `index.html` has no viewport meta, there is no skip link, and about 20 `alert()` calls interrupt assistive-technology flow. |
| Aesthetics | 5 | 4.0 | Consistent CSS design tokens, cascade layers, and a deliberate dark-first theme. |
| UX | 5 | 3.0 | Heavy reliance on `alert()` and `confirm()`, the dead "Forgot password?" link, and the "Dev Override" prompt shown to players. |
| Deployment | 2 | 1.75 | Works on Vercel. The root `vercel.json` still rewrites `tests/`, `test-results/` and `node_modules/` into public routes. |
| Performance | 5 | 3.5 | The service worker (`warg-cache-v7`) uses network-first, stale-while-revalidate and cache-first strategies, with IndexedDB and Background Sync (fixed since FUCK.md). **Deductions:** `html5-qrcode` is loaded from unpkg without a pinned version (`game.html`, `edit_warg.html`), and the "Lighthouse > 90" claim has no supporting report in the repo. |
| Features | 10 | 6.5 | The breadth is impressive: ARG authoring, many minigame types, AI image evaluation (SAM, HSV, MobileNet, SIFT, symmetry, OCR), offline play, live creator analytics, admin moderation, point domination, comments with spoilers. **Deductions:** password reset is missing, there's no points economy (the replay dialog mentions "points" that are never awarded), co-op/live is a Socket.io stub, and the geofence bypass. |
| Responsiveness | 5 | 4.0 | Viewport meta on nearly every page. The mobile fixes driven by user feedback are documented, e.g. the map minimise fix in `9ab7c55` and `905f6ea`. |
| Structure | 5 | 3.5 | Separate `scripts/`, `styles/` and `components/` folders. **Deductions:** `game.js` is about 1000 lines, and there is a lot of inline styling and HTML built in template strings. |

### 3.4 Misc — 14 / 23

| Criterion | Weight | Mark | Justification |
|---|---|---|---|
| Git methodology | 5 | 3.5 | 359 commits (3 Aug – 10 Oct), 38 merged PRs (up to #66), consistent branch prefixes, review before merge. **Deductions:** no tags or releases, the misspelt `feet/` prefix, three stale unmerged branches (`feet-/-pinger`, `feet-/-wiki`, `feet/--Testing-Implementation`), and very uneven commits (ZFakir 133, Yamlack Megersa 72, chrisgiles/Christopher Giles 57, Fakir 1). |
| Integration | 3 | 2.5 | The client, API and AI engine work together well. |
| Testing | 10 | **4.0** | See 3.5. |
| Tools | 5 | 4.0 | ESLint, Jest projects (mocked, unit, integration), Playwright with Monocart V8 coverage, Docker, Gitea CI, Docusaurus. **Deduction:** the docs claim pre-commit hooks, but there is no husky or hook configuration. |

### 3.5 Testing in detail (largest avoidable loss)

- **9 client specs are placeholders.** For example, `client/tests/components/GameCard.spec.js`:
  ```js
  // Basic boilerplate to pass the exhaustive coverage checks
  // As a placeholder, we just assert true
  expect(true).toBeTruthy();
  ```
  The affected files are all 7 `components/*.spec.js`, `api.spec.js` and `config.spec.js`. A marker who opens one of these will discount the whole suite.
- **5 more page specs are smoke tests only** (`studio`, `admin`, `analytics`, `catalogue`, `user-profile`). Each one mocks the profile, loads the page and asserts that `body` is visible.
- **Real client tests exist and are good:** `antiSpoofing.spec.js`, `caching.spec.js`, `offline.spec.js`, `game.spec.js`, `edit_warg.spec.js`, `home.spec.js`, `login.spec.js`, `signup.spec.js`.
- **Server coverage:** the newest local `server/coverage/lcov.info` (28 Sep 2026) gives **53.6% lines (696/1299) and 33.6% branches (198/590)**. That falls in the >50% band, well short of >80%. The tests were not re-run, because that would overwrite local artifacts. The server has 54 test files.
- **Client coverage:** FUCK.md recorded 31.8% statements and 16.97% branches. No newer report is in the working tree.
- **CI gaps:** `ci.yml` runs `test:unit` and `test:integration` but not `test:mocked`. There is no coverage gate.
- **The docs misrepresent the testing.** `warg-docs/docs/8-testing/testing.md` says:
  - a 60% minimum is *"strictly enforced"*, but `jest.config.js` has no `coverageThreshold`;
  - the server is at about 69% statements, which the newest available report does not support;
  - pre-commit hooks exist, but none are configured;
  - the Lighthouse performance score is > 90%, but no report is committed.

---

## 4. FUCK.md Findings: Re-verification on `0beaf22`

### Fixed (credit given)
- The Fakir-Polish work is merged (`fbd10ba`, `a4ad12c`, `f900b5d` and `837dc76` are all ancestors of `main`).
- Build artifacts and model weights are no longer tracked. The smoke-test report is committed.
- Service worker, IndexedDB offline storage and Background Sync are implemented.
- Analytics uses live data, behind `api.requireAuthPage()`.
- Comment XSS is fixed: bodies are rendered with `textContent`.
- `voteArg`, `createArg` and `updateArg` use `req.user` and have ownership checks.
- The `arriveAtWaypoint` SQL injection is fixed.
- User profiles exclude `google_uid`, `session_token`, `password_hash` and `email`.
- `SESSION_SECRET` and other secrets fail fast in production.
- One consolidated `requireAuth` that blocks suspended users. `requireAdmin` is mounted on `/api/admin`.
- `schema.sql` matches the models again.
- The Jest `testMatch` Windows glob bug is fixed.
- Point Domination is merged.
- `submitMinigame` is gated by session and unlock state. The sessions controller has ownership checks.

### Still open
- No tags or SemVer releases. The `feet` prefix is misspelt.
- CI skips `test:mocked`. No coverage thresholds.
- No `/health`, rate limiting, helmet, validation layer or central error handler. 50 MB body limit.
- No pagination and no API versioning.
- Duplicate `/api/sessions/start` endpoint.
- `GET /auth/logout`.
- Socket.io is a stub, so there is no real-time co-op.
- No points economy, push notifications or algorithmic routing.
- Unpinned unpkg dependency. About 20 `alert()` calls. No skip link.
- The root `vercel.json` routes test and `node_modules` paths.
- The docs overclaim: the deployment guide still promises Socket.io co-op and `/health`, and the testing doc's claims are listed in 3.5.

### New since FUCK.md
- **SQL injection in `dominationPing`.**
- **Geofence bypass via the client-sent `geofence_override`.**
- **Unauthenticated `flagArg` that attributes every flag to user 1.**
- **No password-reset flow** (key requirement).
- **No AI usage attribution** (key requirement).
- `updateAccount` doesn't ask for the current password.
- `createArg` leaks `error.message`.

---

## 5. Prioritised Last-Day Fixes

> Do these on a feature branch and merge by PR. Do not commit directly to `main`.

| # | Fix | Est. time | Impact |
|---|---|---|---|
| 1 | **Password reset flow**: `POST /auth/forgot` issues a hashed, time-limited token; `POST /auth/reset` checks it and sets the new password; add a reset page and wire up the "Forgot password?" link. Use Nodemailer, or at minimum a logged reset link for the demo. | 2–3 h | Key requirement |
| 2 | **AI attribution page** in `warg-docs`: which tools were used, for what, and how the output was reviewed. | 30 min | Key requirement |
| 3 | **`dominationPing`**: `parseFloat` the inputs, check `Number.isFinite` and ranges, and use `replacements` instead of template interpolation. | 10 min | Critical security bug |
| 4 | **Remove `geofence_override`**, or have the server honour it only when `NODE_ENV !== 'production'`. Remove the client `confirm()` Dev Override. | 15 min | Core game integrity |
| 5 | **`flagArg`**: add `requireAuth` to the route, use `req.user.user_id`, and remove `reporterId = 1` from `api.js`. | 10 min | Security and data integrity |
| 6 | **Delete or replace the 9 `expect(true)` specs.** Fake tests hurt more than missing ones. | 15 min + | Testing credibility |
| 7 | **Make the docs match the code**: correct the "60% enforced", "~69%", "Lighthouse > 90", "pre-commit hooks", "Socket.io co-op" and `/health` claims, or make them true (a `/health` route is about 5 lines; adding `test:mocked` to CI is 1 line). | 45 min | Honesty affects every criterion |
| 8 | Run coverage again (`npx jest --coverage --runInBand`, `npm run test:ui`) and report the real numbers. | 20 min | Testing |
| 9 | `git tag v1.0.0` on the submission commit and publish a release. | 5 min | Git methodology |
| 10 | Quick fixes: require the current password in `updateAccount`; make logout a `POST`; stop returning `error.message` from `createArg`; pin the `html5-qrcode` version; remove the `tests`, `test-results` and `node_modules` rewrites from the root `vercel.json`; add `aria` labels to the login and signup forms. | 45 min | Design, Deployment, Accessibility |

**Projected outcome:** completing items 1–9 removes the key-requirement risk and should lift the mark into roughly the **72–76** range, mainly through Testing, API Design, Features and Git Methodology.

---

## 6. Limitations of This Assessment

- Live deployments (Vercel, Render, Lightsail, Cloudflare docs) were **not** probed. Data, Availability and App Performance are judged from code and documentation only.
- Lighthouse was not run.
- Test suites were not re-run, to avoid overwriting local artifacts. The server coverage figure comes from a `lcov.info` dated 28 Sep 2026 and may be stale.
- Marks are an informed estimate of how the rubric is likely to be applied. They are not an official grade.
- No tracked files in the repository were modified during this review. This document is the only file created, and it is untracked.
