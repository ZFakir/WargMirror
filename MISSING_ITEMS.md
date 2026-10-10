# The Road to 100 — Missing Items Register

**Project:** WARG Platform (COMS3011A Software Design Project)
**Milestone:** 4 — Final Project Submission
**Branch this document lives on:** `feet/Missing-items` (working from `main` @ `0beaf22`; `main` remains untouched)
**Companion documents:** `MiscellaneousDocumentation/Milestone4_Lecturer_Assessment.md` (full marking table), `FUCK.md` (previous assessment)
**Evidence base:** static code review, live deployment probes (Vercel + Render), Lighthouse 12 mobile and desktop audits, full Jest and Playwright runs executed in a temporary copy of the repository on 10 October 2026.

**How to read this document.** Every item below is a gap between the current state (estimated 67/100) and a full mark. Items are grouped by priority: P0 is security and integrity, then P1 for anything that directly rescues marks, P2 for structural and operational improvements, and P3 for enhancements. Each item lists what is wrong, the exact files involved, the subtasks required to close it, acceptance criteria, how to test it, and an effort estimate. Checked boxes mean complete.

---

## 1. Score model — what each missing item is worth

Total = 100. Current estimate per criterion, plus the points that are realistically recoverable.

| # | Criterion | Weight | Current | Recoverable | Missing items that unlock the points |
|---|---|---|---|---|---|
| 1 | Database — Data | 3 | 2.0 | +1.0 | P2-12 (clean up test data, seed parity) |
| 2 | Database — Deployment | 2 | 2.0 | 0 | — |
| 3 | Database — Structure | 5 | 3.75 | +1.25 | P2-8 (migrations), P2-9 (avatar storage), P2-10 (triggers/derived state) |
| 4 | API — Availability | 3 | 2.0 | +1.0 | P2-2 (`/health`), P2-1 (cold start mitigation) |
| 5 | API — Architecture | 5 | 3.5 | +1.5 | P2-2, P2-3 (validation layer), P0-5/P0-7 (duplicate endpoints, dead code), P2-4 (error handler) |
| 6 | API — Deployment | 2 | 2.0 | 0 | — |
| 7 | API — Performance | 5 | 2.0 | +2.5 | **P1-4** (5.6 MB payload), P2-5 (pagination), P2-6 (N+1), P2-7 (rate limiting + helmet) |
| 8 | API — Design | 10 | 6.0 | +3.5 | **P0-1..P0-7** (all seven defects) |
| 9 | App — Accessibility | 5 | 3.0 | +1.5 | P3-2 (contrast), P3-3 (aria), P3-4 (alert removal), P3-1 (skip links) |
| 10 | App — Aesthetics | 5 | 4.0 | +1.0 | P3-2 (contrast within the theme), P3-5 (inline style extraction) |
| 11 | App — UX | 5 | 3.0 | +1.5 | **P1-1** (dead forgot-password link), P0-2 (dev override dialog), P3-4 |
| 12 | App — Deployment | 2 | 1.5 | +0.5 | P0-8 (test files served), P2-11 (security headers) |
| 13 | App — Performance | 5 | 2.5 | +2.0 | **P1-4**, P2-13 (CLS 0.84 on home), P2-14 (unpinned CDN script) |
| 14 | App — Features | 10 | 6.5 | +2.5 | **P1-1** (password reset), P3-8 (points economy), P3-9 (real-time co-op) |
| 15 | App — Responsiveness | 5 | 4.0 | +1.0 | P3-7 (viewport + mobile polish residuals) |
| 16 | App — Structure | 5 | 3.5 | +1.0 | P3-5 (game.js ~1000 lines, inline styles), P3-6 (component/template cleanup) |
| 17 | Misc — Git Methodology | 5 | 3.5 | +1.5 | **P1-3** (tags/releases), P3-12 (branch hygiene + `feet` spelling) |
| 18 | Misc — Integration | 3 | 2.5 | +0.5 | P3-9 (real-time features actually integrated) |
| 19 | Misc — Testing | 10 | 5.5 | +3.5 | **P1-5** (failing mocked tests + CI gap), **P1-6** (placeholder specs), P2-15 (coverage thresholds) |
| 20 | Misc — Tools | 5 | 4.0 | +1.0 | P2-16 (pre-commit hooks, coverage gates, release tooling) |

**The three biggest single wins, in order:**
1. **P0 + P1 items together** are worth roughly 8–10 marks and are all fixable within a day.
2. **P1-4 (the 5.6 MB image payload)** alone recovers across three criteria (API Performance, App Performance, App UX) because it causes the 14 s mobile LCP.
3. **P1-5 + P1-6 + P2-15 (testing)** convert the weakest category from 4/10 territory to a credible 8/10.

---

## 2. P0 — Security and integrity (blocks a good mark outright)

These are exploits or bypasses in shipped code. A marker who finds any one of these will question the whole submission.

### P0-1 — SQL injection in `dominationPing`

- [ ] Fixed

**Where:** `server/src/controllers/gameController.js` L479–L520, specifically:
- L486: `if (!lat || !lng || !game_id)` — only truthiness is checked.
- L502: `sequelize.fn('ST_GeomFromText', \`POINT(${lat} ${lng})\`, 4326)` — string interpolation.
- L508: raw `sequelize.query`: `` SELECT ST_Distance_Sphere(location, ST_GeomFromText('POINT(${lat} ${lng})', 4326)) AS distance ... `` — this is the injectable sink.

**Why it matters:** any authenticated user can submit an arbitrary WKT/coordinate string and alter the query. The identical bug was already fixed in `arriveAtWaypoint` (L181 now validates with `Number.isFinite`), which proves the team knows the pattern; it was reintroduced here.

**Subtasks:**
1. Replace the truthiness check with:
   ```js
   const latNum = parseFloat(lat);
   const lngNum = parseFloat(lng);
   if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) {
     return res.status(400).json({ error: 'Invalid coordinates' });
   }
   ```
2. At L502, pass the validated numbers: `sequelize.fn('ST_GeomFromText', \`POINT(${latNum} ${lngNum})\`, 4326)` — with numbers, interpolation is safe; or switch to `sequelize.literal` with bound parameters.
3. At L508, move to replacements: `sequelize.query('... ST_GeomFromText(:point, 4326) ...', { replacements: { point: \`POINT(${latNum} ${lngNum})\`, waypoint_id } })`.
4. Copy the same pattern to any other `sequelize.query` in the file — grep for `` POINT(${ `` and for backtick-interpolated queries across `server/src`.
5. Add a regression test: `POST .../ping` with `lat="0) OR 1=1 --"` must return 400.

**Acceptance:** grep for `POINT(${` with a non-numeric variable returns nothing; malicious input returns 400, valid input behaves as before.

**Effort: 20 min.**

### P0-2 — Client-controlled geofence bypass (`geofence_override`)

- [ ] Fixed

**Where:**
- Server: `server/src/controllers/gameController.js` L217 (`const { game_id, submission, geofence_override } = req.body;`), L260–L262 (`// (geofence_override) intentionally bypasses this while testing — remove it` … `if (geofence_override === true) {`).
- Client: `client/scripts/game.js` L581–L596 (the `confirm("...Proceed anyway (Dev Override)?")` dialog) and L665–L670 (the flag is sent in the submission body).

**Why it matters:** the product is a location-based game. Right now any player can pass every GPS check by tapping OK on a dialog that says "Dev Override". It also turns the entire anti-spoofing subsystem into decoration.

**Subtasks:**
1. Server: delete the bypass branch, or gate it strictly on a server-side condition the client cannot influence:
   ```js
   const devOverrideAllowed = process.env.NODE_ENV !== 'production' && req.user.role === 'admin';
   if (geofence_override === true && devOverrideAllowed) { ... }
   ```
2. Server: when a submission arrives with `geofence_override === true` in production, log it (waypoint, user, timestamp) so misuse is visible.
3. Client: remove the `confirm()` Dev Override flow entirely from `game.js`. Replace the failure path with the existing `playModal.showFeedback('fail')` so the UX is unchanged for honest players.
4. Client: remove `geofence_override` from the submission payload.
5. Remove the now-stale comments referencing a temporary override.
6. Test: submit a waypoint while outside the radius in a production-like `NODE_ENV` and confirm the outcome is `fail`, with no dialog.

**Acceptance:** no code path in production lets a client set the proximity outcome; grep for `geofence_override` returns only server-side, environment-gated uses (ideally none).

**Effort: 30 min.**

### P0-3 — Unauthenticated flagging, every flag attributed to user 1

- [ ] Fixed

**Where:**
- `server/src/routes/argRoutes.js` L29: `router.post('/:id/flag', argController.flagArg);` — no `requireAuth`.
- `server/src/controllers/argController.js` L385–L406: reads `reporter_id` from `req.body` and writes it to `Flag.create`.
- `client/scripts/api.js` L249: `flagArg(argId, reason, description, reporterId = 1)`.
- `client/scripts/components/FlagModal.js` L128: calls `api.flagArg(...)` without a reporter id.

**Why it matters:** anonymous users can insert flags, flags can be misattributed to any user id, and the live database already contains flags all recorded as reporter 1. Moderation data is therefore corrupted.

**Subtasks:**
1. Route: `router.post('/:id/flag', requireAuth, argController.flagArg);`
2. Controller: `const reporter_id = req.user.user_id;` and reject `reason` not in the allowed set.
3. Controller: validate `reason` against the enum used in the schema and cap `description` length.
4. Client `api.js`: drop the `reporterId` parameter from the signature.
5. Client `FlagModal.js`: update the call site; the parameter is no longer accepted.
6. Data: write a one-off script (or SQL) to attribute previously mis-attributed flags, or accept and document the corruption.
7. Tests: unauthenticated flag → 401; authenticated flag → 201 with `reporter_id` equal to the session user; the reporter cannot be spoofed by sending a different body value.

**Acceptance:** live probe `POST /api/args/1/flag` with an empty body returns **401, not 400**; the new flag's `reporter_id` always equals the session user.

**Effort: 30 min (plus optional data script).**

### P0-4 — Password change without current-password verification

- [ ] Fixed

**Where:** `server/src/controllers/authController.js` `updateAccount` (L84–L120). It hashes and applies any submitted `password` with no re-authentication. The route is `PUT /auth/account` (`server/src/routes/authRoutes.js` L127).

**Why it matters:** an attacker with a hijacked or shared session can lock the legitimate owner out of a local account with one request. It is a standard OWASP failure.

**Subtasks:**
1. Require `current_password` in the request body when `password` is present.
2. Verify with `bcrypt.compare(current_password, req.user.password_hash)`; return 400 on mismatch.
3. Keep the Google-account guard (already present).
4. Validate the new password against the same rules used at signup (length, etc.).
5. Optionally invalidate other sessions after a password change (`req.session.regenerate` or update `session_token`).
6. Update `client/settings.html` + its script: add a "Current password" field in the change-password form.
7. Tests: wrong current password → 400 and the hash unchanged; correct current password → 200 and the hash changed.

**Effort: 45 min.**

### P0-5 — `GET /auth/logout` mutates state

- [ ] Fixed

**Where:** `server/src/routes/authRoutes.js` L86–L92.

**Why it matters:** GET requests can be triggered by prefetchers, `<img>` tags and crawlers. A user can be logged out by a third party embedding a link. It also breaks REST semantics that the API Design criterion is marked against.

**Subtasks:**
1. Change to `router.post('/logout', ...)`.
2. Keep a backwards-compatible `GET` that only redirects to the client (no state change), or return 405, for one release.
3. Update every client call site: grep `logout` across `client/scripts` and `client/*.html`; replace navigations to `/auth/logout` with a `fetch(..., { method: 'POST', credentials: 'include' })` followed by the intended redirect.
4. Test: logout now happens only on POST.

**Effort: 30 min.**

### P0-6 — `createArg` leaks internal error messages

- [ ] Fixed

**Where:** `server/src/controllers/argController.js` — the 500 handler in `createArg` returns `detail: error.message`. Audit every controller for the same pattern.

**Subtasks:**
1. Remove `detail` from the response; keep `console.error` server-side.
2. Grep the whole `server/src` tree for `error.message` and `err.message` in responses and fix all occurrences.
3. Where a 500 previously hid a 400-class problem (e.g. invalid enum), map the known Sequelize validation errors to friendly 400s.
4. Add a `NODE_ENV !== 'production'`-only debug field if you want to keep developer visibility.

**Effort: 20 min.**

### P0-7 — Duplicate endpoint, dead code, and schema leftover paths

- [ ] Fixed

**Where:**
- `server/src/controllers/sessionController.js` — `startGameSession` duplicates `POST /api/game/:argId/start` and is **non-transactional**, so partial rows can be created on failure.
- `server/src/controllers/gameController.js` — `getGameState` still contains a `req.query.user_id || 1` fallback (unreachable under `requireAuth`, but it advertises an old trust model).

**Subtasks:**
1. Pick one session-start endpoint. Delete the other route, controller method, client call site and tests.
2. Wrap session creation in `sequelize.transaction` so the session row, lock rows and first-waypoint unlock commit or roll back together.
3. Delete the `user_id || 1` fallback and any other `|| 1` user fallbacks (grep for `|| 1`).
4. Re-run integration tests for sessions.

**Effort: 60 min.**

### P0-8 — Test files and internals served publicly on Vercel

- [ ] Fixed

**Where:** root `vercel.json` rewrites `/(styles|scripts|assets|test-results|tests|node_modules)/(.*)` into `client/$1/$2`. Live probe: `GET https://warg-mirror.vercel.app/tests/game.spec.js` returned **200** with the full test source.

**Why it matters:** graders can download your test suite from the production URL; it also inflates attack surface and contradicts the "clean deployment" story. `client/vercel.json` should be checked too.

**Subtasks:**
1. Remove `tests`, `test-results` and `node_modules` from the rewrite list; keep only what the app serves (`styles`, `scripts`, `assets`).
2. Add explicit 404/deny rules for `tests/`, `test-results/`, `node_modules/`, `.v8-coverage/`, `coverage-reports/` if they could still be copied by the Vercel build.
3. Verify `.vercelignore` / project settings don't upload test folders as static assets.
4. Re-deploy and re-probe: `/tests/game.spec.js` must return 404 while `/scripts/api.js` still returns 200.

**Effort: 20 min + deploy.**

### P0-9 — Secret and configuration hygiene check (pre-commit)

- [ ] Fixed

**Subtasks:**
1. Confirm `.env`, `.env.test` and any keys are gitignored (they are untracked today — verify the ignore rules are committed in `.gitignore`).
2. Grep the full history for accidental secret commits: `git log -p --all | Select-String "API_KEY|SECRET|PASSWORD"` — if something was committed, rotate it, don't just delete it.
3. Ensure `AI_KEY`, `SESSION_SECRET`, `DATABASE_URL` exist only in Render/Lightsail environment settings.

**Effort: 20 min.**

---

## 3. P1 — Key requirements and direct mark recovery

### P1-1 — Password reset (brief key requirement) — currently MISSING

- [ ] Implemented

**Where:**
- `client/login.html` L67: `<a href="#">Forgot password?</a>` — a dead link.
- `server/src/routes/authRoutes.js` — no forgot/reset routes exist.
- `server/src/controllers/authController.js` — no reset logic exists.
- The brief requires: sign up, sign in, **reset password**, delete account.

**What "done" looks like:** a user can type their email on a forgot-password page, receive a reset link, open it, set a new password, and log in with it. The token must be single-use and time-limited.

**Subtasks:**

*Server*
1. Schema: add a `password_resets` table (or columns on `users`): `reset_id`, `user_id` FK, `token_hash` (store a hash, never the raw token), `expires_at`, `used_at`, `created_at`. Update `database/schema.sql` and add a migration file under `database/migrations/`.
2. `POST /auth/forgot` — accepts `email`, always answers 200 "{'If the account exists, an email was sent'}" (no account enumeration), throttled to N requests per email per hour, and only for `auth_provider = 'local'`.
3. Token: generate 32 random bytes (`crypto.randomBytes(32).toString('hex')`), store `sha256(token)`, expiry 30–60 minutes, invalidate previous unused tokens for the user.
4. Email delivery: add `nodemailer`. Configure `SMTP_*` environment variables. **Fallback for the demo:** if SMTP is not configured, log the reset URL to the server console and record the link in a dev-only response field gated on `NODE_ENV !== 'production'` — never in production.
5. `POST /auth/reset` — accepts `token` and `new_password`; verify `sha256(token)` matches an unexpired, unused row; enforce the same password policy as signup; hash with bcrypt; set `used_at`; optionally destroy existing sessions for that user.
6. Rate limiting on both endpoints (in-memory limiter is acceptable).
7. Tests: valid flow (forgot → reset → login); expired token rejected; reused token rejected; unknown email returns the same 200 shape; Google-only account cannot reset.

*Client*
8. Rename/repurpose the dead link: `forgot-password.html` and `reset-password.html` pages following the existing page/script pattern (`client/scripts/forgot-password.js`, `client/scripts/reset-password.js`).
9. Forms with proper labels, `aria` attributes and inline error states (match `login.html` conventions, then add the missing aria coverage per P3-3).
10. On reset success, redirect to `login.html` with a success banner.

*Docs*
11. Add the two endpoints to `warg-docs/docs/6-api-reference/auth.md`.
12. Add a short flow diagram to `warg-docs/docs/7-frontend/system-flows.md`.

**Acceptance:** end-to-end demo works from the live site; a stale or reused token fails; no raw token is ever stored.

**Effort: 3–4 h.** This is the single most important item in the register.

### P1-2 — AI usage attribution (brief key requirement) — currently MISSING

- [ ] Implemented

**Where:** the repo has `warg-docs/docs/8-third-party/third-party-code.md` which covers **open-source libraries only**. A grep of every `.md` for ChatGPT, Claude, Copilot, Gemini, LLM or "AI usage" returns nothing. The brief requires disclosure of AI tool usage.

**Subtasks:**
1. Create `warg-docs/docs/8-third-party/ai-attribution.md` with, at minimum:
   - Tools used (e.g. Claude/ChatGPT/Copilot/Qoder), each with what it was used for and roughly where (feature areas or file paths).
   - For each area: what the human wrote vs. what the tool produced, and how the output was reviewed, tested or corrected.
   - What was **not** delegated (architecture decisions, security review, schema design) with one line of justification each.
2. Add the new page to the docs sidebar (`warg-docs/sidebars.js`) next to the third-party page.
3. Add a one-paragraph policy statement: "All AI-assisted code is reviewed by a team member before merge; tests written by hand; attribution maintained in this page."
4. If any code was generated wholesale (e.g. the vision pipeline helpers), name the files explicitly — being concrete is what a marker rewards.
5. Link the page from the repo root `README.md`.

**Acceptance:** a marker can open the docs site and find the attribution page in two clicks; every AI tool the team used is named with a scope statement.

**Effort: 1–2 h (mostly writing).**

### P1-3 — Docs site deployment: find it, fix it, link it

- [ ] Done

**Where:**
- `warg-docs/docusaurus.config.js` L29: `url: 'https://your-docusaurus-site.example.com'` — still the placeholder.
- `warg-docs/wrangler.jsonc` exists (Cloudflare Workers target), but the deployed URL is not discoverable: `https://warg-docs.pages.dev` did not resolve, `https://warg-docs.vercel.app` returned 404, and nothing in the README or the client links to a deployed docs site.

**Why it matters:** "public documentation website on static hosting" is a brief requirement. If **I** could not find the URL in ten minutes of probing, the marker may not find it either — and will mark it missing.

**Subtasks:**
1. Decide the canonical URL and deploy (Cloudflare Workers via `wrangler deploy`, or any static host).
2. Set `url` and `baseUrl` in `docusaurus.config.js` to the real values.
3. Build: `cd warg-docs; npm ci; npm run build` — fix any build errors (the placeholder URL may hide broken absolute links).
4. Deploy and record the URL in: root `README.md` (top, next to the live app links), the docs site itself (`intro.mdx`), and the Milestone 4 submission document.
5. Re-verify: the deployed docs reflect the **current** `main`, including the newest pages.

**Effort: 1 h (mostly deployment plumbing).**

### P1-4 — The 5.6 MB `/api/args` payload (v2 performance + UX)

- [ ] Fixed

**Where and why:**
- Live probe: `GET /api/args` returned **5,630,879 bytes in 3.8 s for 6 ARGs**.
- Lighthouse home page: **2,062 KiB of the 2,187 KiB total** is this response; mobile LCP is **14.3 s**, performance score **57**.
- Root cause: at least one record's `cover_image` is serialized as a raw JSON Buffer array (`{"type":"Buffer","data":[255,216,255,225,...]}`) instead of a URL or an excluded field.

**Subtasks:**
1. Reproduce locally: call `GET /api/args` and locate the oversized record; confirm the Buffer serialization path in the model/controller (check `argController.getArgs` and the `Arg` model / `cover_image` column definition).
2. Exclude `cover_image` from list responses. Serve it from a dedicated endpoint instead: `GET /api/args/:id/cover` returning `res.type(image/jpeg).send(buffer)` with cache headers (`Cache-Control: public, max-age=…`).
3. Add a `has_cover` boolean (or `cover_url`) to list responses so cards can decide what to render.
4. Update the client: `GameCard.js` / `home.js` / `catalogue.js` — swap any inline-data usage for the new URL; include a lightweight placeholder while loading.
5. Audit sibling endpoints and models for the same problem (`GET /api/users/...` avatars — the schema stores `MEDIUMBLOB`s that may leak into responses the same way).
6. Add a response-size guard test: assert `GET /api/args` stays under, say, 200 KB with the seed data.
7. Re-run Lighthouse after deploy: expect home/catalogue performance **85+** and LCP under 4 s on mobile.

**Acceptance:** list endpoint < 200 KB; images load via URLs; Lighthouse main pages ≥ 85 performance.

**Effort: 2–3 h including client changes and redeploy.** Highest value-per-minute item in the register.

### P1-5 — Failing mocked tests + CI gap

- [ ] Fixed

**Where:**
- Failures (run on the current `main`): `tests/controllers/minigameController.test.js` › *"uploadReference should upload reference successfully"* — expects `config_json.reference_image_base64 === 'dGVzdA=='`, receives `undefined`; and `tests/controllers/userController.test.js` › *"getUserLibrary should return user args"* — stale expectation.
- `.gitea/workflows/ci.yml`: runs `test:unit` and `test:integration` but **not** `test:mocked`, which is why the breakage went unnoticed.

**Why it matters:** the mocked project is what actually looks at controllers; excluding it from CI dropped server-reported coverage from **90.65%** (all projects) to **58.15%** (CI only). Simply fixing two tests and adding one CI line converts the Testing criterion from "overstated in docs" to "provably strong".

**Subtasks:**
1. Run `npm run test:mocked` locally, read both failures.
2. `minigameController`: the controller's upload path changed (likely stores a URL or file instead of base64 in `config_json`). Update either the controller to keep the field the tests expect, or the test to match the real contract — decide which side is correct and document it in the test name.
3. `userController`: update the expected shape to the current `getUserLibrary` response.
4. Add to `.gitea/workflows/ci.yml` after `npm run test:unit`: `npm run test:mocked`.
5. Confirm CI green on a PR.
6. Optional but recommended: also add `--coverage` with thresholds (see P2-15).

**Acceptance:** `npm run test:mocked` green locally; CI runs all three Jest projects; a deliberately broken controller fails CI.

**Effort: 1 h.**

### P1-6 — Replace the placeholder client specs

- [ ] Done

**Where:** 9 files contain `expect(true).toBeTruthy()` with comments like *"Basic boilerplate to pass the exhaustive coverage checks"*:
- `client/tests/components/`: FlagModal, GameCard, MapModal, PlayModal, PublishModal, RemoveModal, minigame-handlers
- `client/tests/api.spec.js`, `client/tests/config.spec.js`

Plus 5 smoke-only page specs (`studio`, `admin`, `analytics`, `catalogue`, `user-profile`) that only assert the body is visible. 28 of the 58 Playwright runs are these placeholder tests. Client coverage measured: **26.2% statements / 15.1% branches**.

**Subtasks (per file, roughly 30–45 min each; prioritise by feature value):**
1. **`api.spec.js`** — high value: test the real fetch wrapper. Mock `fetch` via `page.route` and assert: correct URL/method/credentials per call; error propagation; `requireAuthPage` redirect behaviour on 401.
2. **`config.spec.js`** — assert `API_BASE_URL` selection logic and unit conversions.
3. **`FlagModal.spec.js`** — open with a real ARG, submit, assert the POST body (after P0-3, no `reporter_id`), assert validation errors.
4. **`GameCard.spec.js`** — render with a fixture ARG (including the `has_cover`/URL path from P1-4), assert title/caption/rating and click-through to `game.html`.
5. **`PlayModal.spec.js`** — feedback states pass/fail, retry visibility, control cleanup between minigames.
6. **`MapModal.spec.js`** — initialise with waypoints, assert node status classes (locked/unlocked/completed), and the minimise behaviour that was fixed from user feedback (`9ab7c55`, `905f6ea`) — lock that regression in.
7. **`PublishModal.js` / `RemoveModal.spec.js`** — publish validation and destructive-action confirm flow.
8. **`minigame-handlers.spec.js`** — render each game type handler and assert the submission payload shape.
9. Upgrade the 5 page smoke tests: after load, assert one meaningful element per page (studio: form fields; admin: user table rendered from mocked data; analytics: stat cards populated from mocked values; catalogue: at least one card; user-profile: username and stats).
10. Where a component cannot be tested as-is in the browser, extract its pure logic into a small module and test that (this also helps P3-5).

**Acceptance:** zero `expect(true)` in the repo; client coverage reported honestly (target ≥ 50% statements, which clears the upper rubric band); all tests pass in both projects.

**Effort: 6–8 h for the full set; triage the first four for the highest return if time is short.**

### P1-7 — Make the documentation match reality

- [ ] Done

**Where and what's wrong:**

| File | Claim | Reality (measured 10 Oct 2026) |
|---|---|---|
| `warg-docs/docs/8-testing/testing.md` L46 | "strictly enforce a minimum code coverage threshold of 60%" | no `coverageThreshold` in `server/jest.config.js`; CI has no gate |
| `testing.md` L47 | "Server: ~69% statement coverage" | CI-only: 58.2%; all projects: 90.65% — the doc under- and mis-states |
| `testing.md` L48 | "72 passing test cases" | 29 distinct tests × 2 browsers = 58 runs |
| `testing.md` L52 | "Lighthouse Performance Score: > 90%" | home 57 mobile / 55 desktop, catalogue 64/76 |
| `testing.md` L8 | "Pre-commit Hooks: code must pass linting and unit tests before committed" | no husky/hook config exists |
| `testing.md` L53 | "API response times below 200ms on average" | `/api/args` 3.8 s; cold start 32.7 s |
| `4-deployment/deployment-guide.md` | lists `/health` endpoint | live `/health` → 404 |
| `4-deployment/deployment-guide.md` | Socket.io co-op gameplay | `server.js` only logs connect/disconnect |
| `docusaurus.config.js` L29 | production docs URL | still `your-docusaurus-site.example.com` |
| `README.md` | — | no links to deployed app or docs at all |

**Subtasks:**
1. Re-run all suites with the P1-5 fixes in place and record real numbers.
2. Rewrite `testing.md` section 3 with the measured table (and keep it honest and current — a marker checking numbers finds them true).
3. Either implement `/health` (5 lines — see P2-2) and pre-commit hooks (P2-16), or delete the claims.
4. Describe Socket.io accurately: "real-time channel scaffolded; co-op gameplay not shipped" — or implement P3-9.
5. Update the deployment guide's environment checklist with the real set of variables used.
6. Add a "How to reproduce these numbers" block (exact commands) so the claims are verifiable.

**Effort: 1 h.**

### P1-8 — Version tags and a release

- [ ] Done

**Where:** `git tag` is empty; 359 commits and 38 merged PRs with no releases. `warg-docs/docs/5-policies/git-policy.md` states the project follows SemVer.

**Subtasks:**
1. Tag the submission commit: `git tag -a v1.0.0 -m "Milestone 4 submission"` and push the tag.
2. Create the release in Gitea with release notes: headline features, the three security fixes from P0, and known limitations.
3. Optional: align one more tag to an earlier milestone (`v0.3.0` etc.) if the history supports it honestly.
4. From now on, tag every milestone merge.

**Acceptance:** `git ls-remote --tags origin` shows `v1.0.0`.

**Effort: 15 min.**

---

## 4. P2 — Structural and operational gaps (rubric depth)

### P2-1 — Render cold start (32.7 s first request)

- [ ] Mitigated or documented

**Evidence:** first live request to `wargmirror.onrender.com` took 32.7 s (free tier spin-up); subsequent requests were 0.2–3.8 s.

**Subtasks:**
1. Confirm which Render plan is in use; if free, either upgrade for the submission window or accept the cold start.
2. Mitigation options (pick one): an external uptime pinger hitting the API every 10 minutes (e.g. cron-job.org / UptimeRobot); a Render-paid instance; or a documented "warm-up" step in the demo script.
3. Add `keepAliveTimeout` and cold-start notes to `warg-docs/docs/4-deployment/deployment-guide.md`.
4. If a pinger is set up, document it (what pings, where, schedule).

**Acceptance:** either first-request latency under 5 s, or the limitation is documented with the mitigation used during the demo.

**Effort: 30 min.**

### P2-2 — `/health` endpoint

- [ ] Implemented

**Where:** live `/health` returns 404 although the deployment guide lists it; there is no health route in `server/src/app.js`.

**Subtasks:**
1. Add `GET /health` (unauthenticated) in `server/src/app.js`:
   - `status: 'ok'`, `uptime`, `timestamp`.
   - DB check: `sequelize.authenticate()` inside a try/catch — report `db: 'up' | 'down'` with a 200 even if degraded, or 503 if you prefer strict semantics.
2. Optionally have it also probe the AI engine reachability if `AI_SERVICE_URL` is set (short timeout).
3. Add an integration test.
4. Use the endpoint for P2-1 uptime pinging.
5. Confirm the deployment guide's claim is now true.

**Effort: 20 min.**

### P2-3 — Request validation layer

- [ ] Implemented

**Where:** controllers read `req.body`/`req.query` directly (e.g. `flagArg`, `dominationPing`, `submitMinigame`, `createArg`). Only scattered manual checks exist. This is the root cause of every P0 injection/bypass item.

**Subtasks:**
1. Pick a validation library (`zod`, `joi`, or `express-validator` — choose based on team familiarity).
2. Create `server/src/middleware/validate.js` exposing a `validate({ body, query, params })` middleware that returns 400 with a consistent error shape.
3. Define schemas per route, starting with the ones that had vulnerabilities: flag, vote, ping, waypoint arrival, minigame submit, arg create/update.
4. Convert coordinates to a strict schema: `lat: z.coerce.number().min(-90).max(90)`, `lng: z.coerce.number().min(-180).max(180)`.
5. Centralise error shape: `{ error: { code, message, details? } }`, applied to every controller response going forward.
6. Add tests per schema: each rejected field type.

**Acceptance:** the injection regression tests from P0-1 pass through schema rejection, not ad-hoc checks; new route code can adopt `validate` in one line.

**Effort: 3–4 h (touches every controller; do first on the P0 items, then fold in).**

### P2-4 — Central error handler + 404 handler + consistent error shapes

- [ ] Implemented

**Where:** `server/src/app.js` has no error middleware; each controller has its own try/catch with bespoke shapes and occasional `error.message` leaks (P0-6).

**Subtasks:**
1. Add a final `app.use((err, req, res, next) => ...)` error handler in `app.js`: log full error server-side, return generic 500 JSON, include stack only when `NODE_ENV !== 'production'`.
2. Add a JSON 404 handler for unknown `/api/*` routes.
3. Provide an `asyncHandler(fn)` wrapper (or use `express-async-errors`) so controllers can drop repetitive try/catch blocks.
4. Migrate controllers incrementally, starting with arg and game controllers.
5. Update the API reference docs with the standard error shape.

**Effort: 2 h.**

### P2-5 — Pagination across list endpoints

- [ ] Implemented

**Where:** `GET /api/args` returns everything (5.6 MB for 6 ARGs, will grow linearly); comments, sessions history and admin user lists have no page parameters. Only `getCreatorAnalytics` flags have `limit: 20`.

**Subtasks:**
1. Define a shared convention: `?page=1&page_size=20` with `page_size` capped (e.g. 100), plus a response envelope `{ data, page, page_size, total }` (or keep bare arrays and add headers — decide once and document).
2. Implement on: `GET /api/args`, `GET /api/comments/arg/:id`, `GET /api/admin/users`, admin flags list, and any other list endpoints found by grepping `findAll` without `limit`.
3. Update the client callers to request pages and handle "load more".
4. Tests: default page size, boundary pages, oversized `page_size` clamped, invalid values rejected.
5. Document in `warg-docs/docs/6-api-reference/`.

**Effort: 3–4 h.**

### P2-6 — N+1 queries in `evaluateConditions` and friends

- [ ] Fixed

**Where:** `server/src/controllers/gameController.js` — `evaluateConditions` queries per condition; related patterns exist wherever loops await queries. `/api/args` also eager-loads related rows that could be trimmed.

**Subtasks:**
1. Instrument: enable Sequelize logging locally and count queries per endpoint for a multi-waypoint ARG.
2. Rewrite `evaluateConditions` to fetch each collection in one query and evaluate in memory.
3. Use `include` with `required: false` and explicit `attributes` (only what the client needs) on the ARG list.
4. Add query-count assertions to integration tests (e.g. via a counting hook) so regressions are caught.
5. Re-measure endpoint timings; record before/after in the docs.

**Effort: 2–3 h.**

### P2-7 — Rate limiting and HTTP hardening (helmet)

- [ ] Implemented

**Where:** no `helmet`, no rate limiting; live headers show `x-powered-by: Express` and no CSP/`X-Frame-Options`/`X-Content-Type-Options`. The Vercel frontend has HSTS but no CSP.

**Subtasks:**
1. `app.use(helmet())` with a sensible default set; disable `contentSecurityPolicy` for the API (JSON only) or set it explicitly.
2. `app.disable('x-powered-by')`.
3. Rate limiting: `express-rate-limit` with two tiers — a global limiter (e.g. 300 req/15 min per IP) and strict limiters on auth endpoints (login, signup, forgot, reset) and write endpoints (flag, vote, minigame submit).
4. Trust proxy correctly for Render (`app.set('trust proxy', 1)`) so limits key on the real client IP.
5. Enforce/verify the `express.json` limit: 50 MB is excessive — reduce to what uploads actually need, and ensure uploads use multipart (multer) rather than JSON anyway.
6. Frontend: add a CSP meta or Vercel header config; at minimum `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
7. Tests: 429 after N auth attempts; headers present in responses.

**Effort: 3 h.**

### P2-8 — Database migrations (replace ad-hoc scripts)

- [ ] Implemented

**Where:** `database/migrations/` exists but the real drift fixers are loose root scripts: `alter_enum.js`, `migrate_minigames_enum*.js`. `schema.sql` is a snapshot, not a migration path.

**Subtasks:**
1. Adopt `sequelize-cli` migrations (already using Sequelize) or `umzug`; initialise `server/src/migrations/` with a baseline matching current `schema.sql`.
2. Convert each ad-hoc script into a numbered migration (or verify they are already reflected and retire them).
3. Add npm scripts: `db:migrate`, `db:migrate:undo`, `db:seed`.
4. Update seed flow: `npm run seed` runs migrations first.
5. Integrate into CI: run migrations against the CI MySQL before integration tests (replacing any implicit sync).
6. Document in `warg-docs/docs/3-database/` (create a migrations section) and in the deployment guide.

**Effort: 4–5 h.**

### P2-9 — Avatar/cover storage out of the database (MEDIUMBLOB)

- [ ] Fixed

**Where:** `database/schema.sql` — user avatars are `MEDIUMBLOB`s; ARG covers are buffers (see P1-4). The live payload proves the cost.

**Subtasks:**
1. Move new uploads to the filesystem/object storage (the server already writes minigame uploads to `server/uploads/minigames/`; extend the same pattern, or use S3-compatible storage).
2. Store only the path/URL in the DB.
3. Write a migration + backfill script for existing rows.
4. Serve via the P1-4 image endpoints with cache headers.
5. Cap upload sizes and validate MIME types on all image endpoints.
6. Document the pattern in `warg-docs/docs/2-architecture-and-design/implementation-details.md`.

**Effort: 3–4 h.**

### P2-10 — Derived-state integrity (counts, trust score) in the database

- [ ] Designed, then implemented if time allows

**Where:** `play_count`, `completion_count`, `like_count`, `dislike_count`, `rating_sum`, `rating_count` are maintained in application code (and analytics relies on them). There are no triggers or check constraints; schema.sql has no triggers, unlike.

**Subtasks:**
1. Decide the mechanism per counter: DB triggers, or application-level updates inside transactions (pick one and be consistent).
2. At minimum, wrap vote/play/complete writes in transactions with the counter updates so they cannot diverge.
3. Add a consistency-check script (recompute counters from source tables; report diffs) and run it against production once.
4. Document the chosen approach and its trade-off in the database docs.

**Effort: 2–3 h for the transaction approach; +2 h for triggers.**

### P2-11 — (merged into P0-8 / P2-7)

Security headers work lives in P2-7; public-file exposure lives in P0-8.

### P2-12 — Production data hygiene

- [ ] Done

**Evidence:** production has 6 published ARGs including obvious test entries ("Games", "Full set") and low play counts (34/18/9 for the top three).

**Subtasks:**
1. Remove or unpublish test/demo ARGs that look accidental; keep a curated demo set that tells a story for the marker.
2. Ensure at least 2–3 quality ARGs with real waypoints and at least one AI-verified minigame each so a demo flows end-to-end.
3. Check for orphaned/duplicate users (e.g. multiple test accounts) and clean them via the admin panel.
4. Re-verify the home/catalogue pages look curated after cleanup.

**Effort: 1–2 h.**

### P2-13 — Home page CLS 0.84 (desktop)

- [ ] Fixed

**Where:** Lighthouse desktop home: **CLS 0.841** (bad), caused by the ARG cards colliding with late-loading data/images (compounded by P1-4). Mobile CLS was 0.182.

**Subtasks:**
1. Reserve layout space for the card grid: fixed aspect-ratio placeholders (skeleton cards) rendered before data arrives.
2. Set explicit `width`/`height` (or CSS `aspect-ratio`) on cover images.
3. Ensure the hero/banner area has a fixed min-height so it doesn't reflow when data loads.
4. Defer non-critical widget initialisation until after first paint.
5. Re-run Lighthouse: target CLS < 0.1 on both mobile and desktop.

**Effort: 2 h.**

### P2-14 — Pin the unpinned CDN script

- [ ] Fixed

**Where:** `client/game.html` (L464) and `client/edit_warg.html` (L507) load `https://unpkg.com/html5-qrcode` with no version — it resolves to latest and can break anytime, and it is a supply-chain risk.

**Subtasks:**
1. Pin an exact version (e.g. `https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js`).
2. Better: vendor the file into `client/vendor/` and add an SRI hash.
3. Test the QR scanning flow in the camera minigame after switching.

**Effort: 20 min.**

### P2-15 — Coverage thresholds and honest coverage reporting

- [ ] Implemented

**Subtasks:**
1. Turn on coverage in CI for all three Jest projects: `jest --coverage --runInBand` (mirror the docs' own advice).
2. Add `coverageThreshold` to `server/jest.config.js` at the current measured floor (e.g. 70% lines initially) so it ratchets, not regresses. Recommended sequence: set to measured value, then raise as tests are added.
3. Playwright: keep the Monocart V8 coverage report, but pin the known Firefox context-close flakiness by reducing workers under coverage or serializing the flaky specs (see P1-6 notes).
4. Publish the real numbers in `testing.md` (P1-7) with the exact commands.
5. Optional badge: generate a coverage summary JSON and commit a small badge to the README.

**Effort: 2 h (mostly the threshold calibration and doc sync).**

### P2-16 — Pre-commit hooks (claim to reality)

- [ ] Implemented

**Where:** `testing.md` claims pre-commit hooks enforce lint + unit tests; no husky/lint-staged/pre-commit config exists.

**Subtasks:**
1. Add `husky` + `lint-staged` (or a repo-native Gitea hook if you prefer not to add tooling).
2. Hook: `eslint` on staged files in the right workspace; run the fast Jest project (`test:unit` or `test:mocked`) before allowing commits touching `server/src`.
3. Document setup in the README so it is a one-command bootstrap (`npm run prepare`).
4. Update `testing.md` — the claim becomes true.

**Effort: 1 h.**

---

## 5. P3 — Enhancements and polish (the last points to 100)

### P3-1 — Skip-to-content links and focus management

- [ ] Done

**Subtasks:**
1. Add a "Skip to main content" link as the first focusable element on every page, visible on focus; ensure each page has a `<main id="main-content">`.
2. Move focus to the modal container when modals open, trap focus while open, and return focus to the trigger element on close (map/play/publish/flag modals in `client/scripts/components/`).
3. Escape key closes modals consistently.
4. Audit tab order on `game.html` and `edit_warg.html` (the most complex pages).

**Effort: 3 h.**

### P3-2 — Colour contrast failures (largest measured a11y loss)

- [ ] Fixed

**Evidence (Lighthouse):** 35 elements on home and 21 on catalogue fail `color-contrast`; login/signup have 5 each. Also 25 `label-content-name-mismatch`, 12 `aria-allowed-role`, 3 `aria-hidden-focus`, 1 `heading-order`, 1 `aria-required-children`.

**Subtasks:**
1. Extract the failing pairs from the Lighthouse JSON reports (already generated under `%TEMP%\warg-eval\lh\` — or regenerate per page) and map them to design tokens in `client/styles/`.
2. Raise contrast of the muted text tokens (the phosphor/beige palette on the dark console background is the usual suspect) to at least 4.5:1 for body text, 3:1 for large text. Adjust token hex values in one place — the token system makes this a small change.
3. Fix `label-content-name-mismatch`: buttons whose visible text doesn't match their accessible name (visible label vs `aria-label`).
4. Fix `aria-allowed-role` usages (roles used on wrong element types).
5. Fix `aria-hidden-focus` (focusable elements inside `aria-hidden` containers — usually map markers).
6. Re-run Lighthouse a11y: target ≥ 95 on all main pages.

**Effort: 3–4 h.** Biggest single accessibility win; the token system makes the colour part cheap.

### P3-3 — Accessibility coverage on auth pages + alerts

- [ ] Done

**Where:** `login.html` and `signup.html` have **zero** `aria-*` attributes; `index.html` has no viewport meta; there is no skip link.

**Subtasks:**
1. Add proper `<label>` associations, `aria-invalid` + `aria-describedby` error wiring, `role="alert"` on error banners, and `aria-live` on the password-strength region (signup).
2. Add the viewport meta to `index.html` (currently missing).
3. Replace `alert()`/`confirm()` with an accessible toast/dialog component (this also closes P3-4).

**Effort: 2 h.**

### P3-4 — Remove `alert()` and `confirm()` from the product

- [ ] Done

**Where:** ~20 `alert()` calls across `client/scripts/` (game.js, edit_warg.js, studio.js, settings.js, analytics.js, home.js, etc.) plus `confirm()` dialogs.

**Subtasks:**
1. Build (or reuse) a toast/notification component with `role="status"`/`role="alert"` and a `window.confirmModal`-style dialog (one already exists — `confirmModal.open` is used in game.js L699; reuse and extend it).
2. Replace every `alert('Failed to …')` with the toast; replace every `confirm()` with the modal (including the Dev Override one, which is deleted anyway in P0-2).
3. Keep a lint rule (or code-review note) so new `alert(` calls are rejected.
4. Playwright caveat: the existing test guidance about dialog listeners becomes moot — update `testing.md` note accordingly.

**Effort: 3 h.**

### P3-5 — Structure: break up `game.js` and extract inline styles

- [ ] Done

**Where:** `client/scripts/game.js` ~997 lines with inline styles built in template strings (e.g. the spinner markup L644–657, inline `style.marginBottom` chains); `MapModal.js` ~1326 lines.

**Subtasks:**
1. Split `game.js` into modules matching its actual concerns (map bootstrap, waypoint flow, minigame orchestration, comments, offline sync) under `client/scripts/` with ES module imports already in use.
2. Move repeated inline styles into `client/styles/` classes (`minigame-wrapper`, spinner, comment items already have classes — finish the job).
3. Same treatment for the biggest components where markup strings exceed ~50 lines: use a small `el(tag, props, children)` helper or template `<template>` elements.
4. Keep behaviour identical; run Playwright after each split.

**Effort: 4–6 h.**

### P3-6 — Component/template cleanup and dead UI

- [ ] Done

**Subtasks:**
1. Grep for orphaned HTML/JS (pages not linked from navigation, scripts not loaded anywhere, CSS classes unused).
2. Remove or finish the "Lorem Picsum" placeholder banners in `create_warg.html` / `edit_warg.html` once P2-9 gives real uploads.
3. Consolidate duplicated nav markup if `update_nav.py` is still the mechanism — document it or replace it with a build step.
4. Remove `client/.DS_Store` and any other OS artefacts (root `.DS_Store` also exists).

**Effort: 2 h.**

### P3-7 — Responsiveness residual issues

- [ ] Done

**Where:** viewport meta is present on most pages but Lighthouse mobile remains poor; the user-feedback log documents past mobile fixes (map minimise, etc.).

**Subtasks:**
1. Test the four main flows (catalogue, ARG play, studio authoring, analytics) at 360×640 and 768×1024; log and fix overflow/tap-target issues (44 px minimum).
2. Verify the map modal controls are reachable with one thumb; confirm the fixed minimise behaviour still holds.
3. Add `aspect-ratio` handling for the card grid (shares work with P2-13).
4. Screenshot each pass into `smoke-test/screenshots/` to keep the existing evidence trail current.

**Effort: 3 h.**

### P3-8 — Points economy (the "Recplay" promise)

- [ ] Implemented

**Where:** dialogs reference "points" (e.g. game.js replay modal: "Your session progress and points will be reset"), `sessionController`/`gameController` award none, and `users` has no points column.

**Subtasks:**
1. Decide the minimal economy: points per minigame pass, per ARG completion, with a multiplier for first-time completion (no need for a full shop).
2. Schema: `users.points_total` (or a `points_ledger` table with `(user_id, delta, reason, ref_id, created_at)` — prefers the ledger for auditability).
3. Award points in `submitMinigame` on `pass`, inside the same transaction as completion state; idempotent per (user, minigame attempt) so retries cannot farm points.
4. Expose: total on profile and session summary; rank in ARG leaderboard (optional: per-ARG leaderboard view).
5. Update the replay confirmation copy to match what actually happens.
6. Tests: points awarded once per pass; replay resets progress per the documented rule; ledger sums match totals.

**Effort: 1 day.**

### P3-9 — Real-time co-op (or an honest downgrade)

- [ ] Decision made and implemented

**Where:** `server/server.js` Socket.io handles connect/disconnect only; the deployment guide and third-party docs claim co-op gameplay.

**Option A (downgrade — recommended for the deadline):** update docs to "realtime layer scaffolded", remove co-op claims from the deployment guide and any marketing copy; keep `mode: 'coop'` but cap it in the UI as "coming soon" or hide it.

**Option B (implement the minimum):** 
1. Room per ARG session: join on session start.
2. Events: teammate position updates (throttled), waypoint completion broadcast, chat-lite.
3. Server authority: validate events against session state; don't trust client positions beyond the anti-spoofing middleware already in place.
4. Client: subscribe in `game.js`, show teammate markers on the map.
5. Tests: two Playwright contexts joining one session and seeing each other's completion state.

**Effort: 2 h for the honest downgrade; 1–2 days for a real implementation.**

### P3-10 — Push notifications

- [ ] Implemented or explicitly out of scope

**Where:** `client/sw.js` already exists with Background Sync — the notification infrastructure is half-ready but unused. Feature absent from the UI/docs tier list.

**Subtasks (if in scope):**
1. Request permission at an appropriate moment (after first ARG completion, not on load).
2. Server: store subscriptions, send notifications on admin announcements / friend activity / ARG publishing.
3. Service worker: `push` event handler + notification click routing.
4. VAPID keys in env; document.
5. If **not** in scope: state it in the docs' scope section so its absence is a decision, not a gap.

**Effort: 1 day, or 15 min to document as out of scope.**

### P3-11 — Algorithmic routing / recommendations

- [ ] Implemented or explicitly out of scope

**Where:** the catalogue shows all ARGs; no recommendation logic exists (was listed as an advanced-tier aspiration).

**Subtasks (if in scope):**
1. Minimal viable version: "nearby ARGs" using the spatial columns already in MySQL (`ST_Distance_Sphere` against the player's last-known position) and "because you played X" (same genre/creator).
2. Endpoint: `GET /api/args/recommended`; cache-free is fine at this scale.
3. Surface as a row on `home.html` with a label that explains why each is shown.
4. Otherwise: document the deliberate exclusion.

**Effort: 4 h minimal version.**

### P3-12 — Git hygiene residuals

- [ ] Done

**Subtasks:**
1. The prefixed branches in this project use `feet/` where `feat/` was intended. For future branches use `feat/`; leave historical ones as-is (renaming merged branches churns nothing of value) — but note it in the git policy doc so it reads as intentional going forward.
2. Close or merge the three stale remote branches: `feet-/-pinger`, `feet-/-wiki`, `feet/--Testing-Implementation` (delete remote refs after confirming they hold nothing unmerged).
3. Commit author mixing: "chrisgiles" and "Christopher Giles" are the same person — run `git shortlog -sne` and set a consistent `.mailmap` so the contribution split reads cleanly.
4. Contribution balance: the top author has ~2.5× the runner-up. If any member's infrastructure/documentation work isn't visible in commits, make it visible (a docs PR count) before the marker reads the graph.

**Effort: 1 h.**

### P3-13 — Docs content completeness vs the tier list

- [ ] Done

**Subtasks:**
1. Add the missing pieces the marker will look for on the docs site: an updated API reference covering every live route (auth pages, health, cover endpoints after P0/P1 changes), a "Known limitations" page, and a "Testing evidence" page with the P1-7 numbers.
2. Screenshot the live app (desktop + mobile) into the docs so the site shows the product, not only prose.
3. Add AI attribution (P1-2) to the sidebar — already a subtask there.
4. Make sure `warg-docs/docs/1-overview/meetings.md` and the user-feedback report are current to the final sprint.

**Effort: 3 h.**

---

## 6. Suggested execution order (two parallel tracks)

**Track A — security + data (one developer, one day):**

| Order | Item | Time |
|---|---|---|
| 1 | P0-1 SQL injection | 20 min |
| 2 | P0-3 flag auth | 30 min |
| 3 | P0-2 geofence override removal | 30 min |
| 4 | P0-6 error leak + P0-7 duplicate/dead code | 1.5 h |
| 5 | P0-8 Vercel rewrites + redeploy + re-probe | 30 min |
| 6 | P0-4 password-change verification | 45 min |
| 7 | P0-9 secret/history check | 20 min |

**Track B — requirements + performance (another developer, one day):**

| Order | Item | Time |
|---|---|---|
| 1 | P1-4 payload fix (server + client + redeploy) | 2–3 h |
| 2 | P1-8 tag + release | 15 min |
| 3 | P2-2 health endpoint | 20 min |
| 4 | P1-3 docs URL fix + deploy + README links | 1 h |
| 5 | P1-2 AI attribution page | 1–2 h |

**Then together, in this order:**

| Order | Item | Time |
|---|---|---|
| 1 | P1-5 mocked tests + CI | 1 h |
| 2 | P2-15 coverage thresholds | 2 h |
| 3 | P1-7 docs honesty pass (now that numbers are real) | 1 h |
| 4 | P1-1 password reset (the big one) | 3–4 h |
| 5 | P1-6 placeholder test replacement (triage top 4 files) | 3 h |
| 6 | P2-7 helmet + rate limits, then P2-13 CLS, P2-14 pin script | 5 h |
| 7 | Re-run Lighthouse + full test suite; re-record evidence | 1 h |

**Definition of done for the whole register:** every box checked; the score model in section 1 re-measured against a fresh Lighthouse run, fresh coverage numbers and a fresh live probe; the assessment document updated with the new evidence.
