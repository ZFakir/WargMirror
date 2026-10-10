# WARG Platform — Remaining Work Register

**Purpose:** This is the implementation backlog remaining after the work on `feet-/Polish-F`. It replaces the earlier aspirational “road to 100” register with an evidence-based plan that does not duplicate work already on Polish-F.

**Baselines reviewed**

| Reference | Commit | Use in this document |
|---|---:|---|
| `main` | `0beaf22` | Current merged baseline; not modified by this document. |
| `feet-/Polish-F` | `079b98c` | Completed-but-unmerged implementation baseline. This branch must be independently reviewed and merged through a PR. |
| `feet/Missing-items` | `38e17aa` before this revision | Original missing-items register. |

**Important:** Nothing listed as “addressed in Polish-F” is merged into `main` yet. It is excluded from the actionable backlog only to avoid duplicate implementation. If the Polish-F PR is changed, rejected, or fails verification, restore the relevant item to the backlog.

---

## 1. Reconciliation: work addressed by `feet-/Polish-F`

This section is a verification record, not an implementation to-do list. The checkbox markers preserve the original item identifiers so the previous assessment and this document can be cross-referenced.

### P0 — Security and integrity

- [x] **P0-1 — SQL injection in `dominationPing`.** `server/src/controllers/gameController.js` now validates finite, in-range numeric coordinates, constructs `pointWkt` only after validation, and passes it as the `:point_wkt` query replacement.
- [x] **P0-2 — Client-controlled geofence bypass (`geofence_override`).** The server only honours the override outside production; `client/scripts/game.js` no longer presents or sends the Dev Override dialog/flag.
- [x] **P0-3 — Unauthenticated flagging, every flag attributed to user 1.** `server/src/routes/argRoutes.js` applies `requireAuth`; `argController.flagArg` uses `req.user.user_id`; `client/scripts/api.js` no longer accepts a reporter id.
- [x] **P0-4 — Password change without current-password verification.** `authController.updateAccount` checks `current_password` with bcrypt; `client/settings.html` collects it before a local password change.
- [x] **P0-5 — `GET /auth/logout` mutates state.** `server/src/routes/authRoutes.js` now exposes `POST /auth/logout`; the API wrapper posts to it.
- [x] **P0-6 — `createArg` leaks internal error messages.** `argController.createArg` no longer returns `error.message` in its 500 response.
- [x] **P0-7 — Duplicate session route and game-state user fallback.** The duplicate session-start route/controller code was removed, and `getGameState` uses `req.user.user_id` directly.
- [x] **P0-8 — Test paths served by Vercel.** Root `vercel.json` no longer rewrites `tests`, `test-results`, or `node_modules` to client files.

### P1 — Direct mark recovery

- [-] **P1-1 — Password reset.** A functional minimal flow exists: new reset-token columns in `database/schema.sql` / `server/src/models/User.js`; `forgotPassword` and `resetPassword` in `server/src/controllers/authController.js`; `POST /auth/forgot` and `POST /auth/reset`; `client/reset-password.html` and `client/scripts/reset-password.js`; and an updated `client/login.html` link. It remains partial because delivery is console-only and there is no abuse protection or repeatable database migration.
- [-] **P1-2 — AI usage attribution.** `warg-docs/docs/10-ai-usage/ai-attribution.md` exists, but it is a skeleton containing placeholders. It is not a submission-ready declaration.
- [x] **P1-5 — Failing mocked tests + CI gap.** `.gitea/workflows/ci.yml` now runs `npm run test:mocked`; stale controller expectations were changed and additional tests were added.
- [x] **P1-6 — Replace the placeholder client specs.** The API/config/component specs were replaced with non-trivial Playwright coverage rather than `expect(true)` placeholders.
- [-] **P1-7 — Make documentation claims honest.** The branch removes unsupported pre-commit, performance and Socket.io claims and corrects CI/test narrative. The figures still need a final run on the merged candidate before being cited as final evidence.

### P2/P3 — Structure, operations, and quality

- [x] **P2-2 — `/health` endpoint.** `server/src/app.js` exposes `GET /health` with `{ status: 'ok' }`.
- [x] **P2-14 — Pin the unpinned CDN script.** `client/game.html` and `client/edit_warg.html` pin `html5-qrcode@2.3.8`.
- [-] **P2-15 — Coverage reporting.** `server/jest.config.js` now has `collectCoverageFrom: ['src/**/*.js']`, improving honesty. No coverage threshold/gate exists yet.
- [-] **P3-2/P3-3 — Accessibility.** Auth pages gained ARIA/autocomplete changes and `client/index.html` gained a viewport tag. The broader Lighthouse failures, skip link, modal focus handling and native dialogs remain.
- [x] **P3-9/P3-10/P3-11 — Documentation scope.** README and deployment docs no longer claim shipped realtime co-op, push notifications, or algorithmic routing.
- [x] **P3-12 — Branch naming decision.** The teammate checklist explicitly treats existing `feet` names as intentional historical names. Do not rename them merely for polish.

---

## 2. Final merge gate for Polish-F (do this before implementing new work)

The work exists on `feet-/Polish-F`, not on `main`. Complete this gate in a PR before relying on any `[x]` item above.

### 2.1 Diff and review

- [ ] Review `git diff main...feet-/Polish-F` specifically for the auth, geofence and raw-SQL changes.
- [ ] Confirm `server/src/routes/argRoutes.js` protects `POST /:id/flag` with `requireAuth` and that no client body field can override `req.user.user_id`.
- [ ] Confirm `gameController.dominationPing` accepts JSON numbers, rejects strings / out-of-range coordinates, and does not interpolate raw request values into SQL.
- [ ] Confirm production `NODE_ENV` cannot pass GPS proximity because a client sends `geofence_override: true`.
- [ ] Confirm `vercel.json` still serves `/styles`, `/scripts` and `/assets`, while `/tests/game.spec.js` returns 404 after deployment.

### 2.2 Required verification

Run these from the relevant workspace. Do not update documentation counts until the resulting run is recorded.

```powershell
cd server
npm run lint
npm run test:mocked
npm run test:unit
npm run test:integration

cd ..\client
npm run lint
npx playwright test --reporter=json
```

- [ ] Run the server suites. If integration tests require the Aiven `warg_test` database, use only the test URL guarded by the existing test setup.
- [ ] Run Playwright once with a plain/JSON reporter for correctness, then separately with Monocart coverage if needed. Previous coverage-reporter Firefox timeouts must not be described as product failures without reproducing them.
- [ ] Build the docs site: `cd warg-docs; npm ci; npm run build`.
- [ ] Open a PR, require CI, and merge Polish-F only after the checks are green.

**Effort:** 1–2 hours plus CI wait. **Scoring impact:** protects all regained security, API-design and testing marks.

---

## 3. P1 — Remaining key requirements and high-return work

### P1-1b — Complete password reset for a deployed application

**Status:** Partial Polish-F implementation exists; this item completes it.

**Why it matters for scoring:** The brief requires reset-password capability. Console logging demonstrates a local coursework flow, but is not an end-user delivery mechanism and does not address reset-abuse controls. Completing it turns a partial key requirement into a defensible production-style implementation.

**Files and current symbols**

- `server/src/controllers/authController.js`: `forgotPassword`, `resetPassword`.
- `server/src/routes/authRoutes.js`: `POST /forgot`, `POST /reset`.
- `server/src/models/User.js` and `database/schema.sql`: `password_reset_token`, `password_reset_expires`.
- `server/migrate_password_reset.js`: one-off script added by Polish-F.
- `client/reset-password.html`, `client/scripts/reset-password.js`, `client/login.html`.
- `server/tests/controllers/authController.test.js`, `server/tests/integration/auth.test.js`, `server/tests/routes/authRoutes.test.js`.

**Implementation subtasks**

1. Decide the delivery policy with the team:
   - **Submission-safe minimum:** configure SMTP through environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) and send the link using Nodemailer.
   - **If email cannot be configured:** clearly label console-link delivery as a development/demo fallback in the docs; do not claim it is email delivery.
2. Add a mail adapter module, e.g. `server/src/services/mailService.js`, so `forgotPassword` does not contain transport setup. It should fail safely: log a server error, return the same generic user response, and never return the raw token in production.
3. Add rate limits to `/auth/forgot` and `/auth/reset` (coordinate with P2-7). Use a stricter limiter for reset requests than for normal API calls.
4. Keep anti-enumeration behaviour: existing and nonexistent local emails must receive the same status/message. Explicitly decide the message behaviour for Google-only accounts and test it.
5. Decide session policy: after reset, invalidate active sessions for that user or document why existing sessions remain valid. Preferred implementation: regenerate / invalidate session-store rows for the user after password update.
6. Replace `server/migrate_password_reset.js` with a repeatable database migration as part of P2-8. The schema and migration must be idempotent and deployable to a non-empty database.
7. Add a password-policy helper reused by signup, account update and reset, rather than keeping three independent length checks.
8. Update `warg-docs/docs/6-api-reference/auth.md` and `warg-docs/docs/7-frontend/system-flows.md` with the generic-response/security behaviour.

**Required tests**

- Unknown, local and Google-auth emails yield indistinguishable public reset-request responses.
- Stored token is a hash; raw token is not persisted.
- Token expires after the configured time and is single use.
- Successful reset changes the password hash and supports a subsequent local login.
- Rate limiter returns 429 after the configured threshold.
- A mail adapter receives the expected reset URL in configured environments.

**Acceptance:** an actual recipient can reset a local password through the deployed interface; no raw token is stored or exposed; all reset tests pass.

**Effort:** 3–5 hours, depending on SMTP availability.

### P1-2b — Replace the AI-attribution skeleton with a truthful declaration

**Status:** Skeleton created by Polish-F; content still missing.

**Why it matters for scoring:** The brief requires AI usage attribution. A template demonstrates awareness, but blank placeholders do not disclose the team's actual usage.

**Files**

- `warg-docs/docs/10-ai-usage/ai-attribution.md`.
- `warg-docs/sidebars.js` (verify the new docs section is reachable in navigation).
- `README.md` (add a direct documentation link once docs deployment is resolved).

**Implementation subtasks**

1. Collect declarations from every team member before editing the page. Do not infer tool usage for a person who has not confirmed it.
2. Replace every placeholder row/text with: tool name; work area or file/module; allowed purpose (explanation, boilerplate, debugging, test idea, refactoring); human reviewer; and verification performed.
3. Add a concise review policy stating what was checked manually and through tests. Only claim peer review where it occurred.
4. State any non-AI authored areas only if the team can support the statement.
5. Ensure no placeholder text remains (`grep` for `placeholder`, `_e.g.`, and `Add one row`).
6. Add the page to the sidebar if it is not auto-generated and include the deployed docs URL in the repository README after P1-3.

**Acceptance:** no template content remains; each team member's disclosure is explicit; a marker can navigate to it from the docs sidebar.

**Effort:** 1–2 hours, dependent on team-member responses.

### P1-3 — Deploy and make the documentation site discoverable

**Status:** Not addressed by Polish-F.

**Why it matters for scoring:** The brief requires a publicly hosted static documentation site. At assessment time, `warg-docs/docusaurus.config.js` still used `https://your-docusaurus-site.example.com`; the docs URL was not discoverable from README/client and could not be found through expected hostnames.

**Files**

- `warg-docs/docusaurus.config.js`: set `url` and `baseUrl`.
- `warg-docs/wrangler.jsonc`: Cloudflare worker configuration.
- `warg-docs/package.json`: build/deploy scripts.
- `README.md`: canonical links to the app and documentation site.
- `warg-docs/docs/intro.mdx`: optional published-site link/reference.

**Implementation subtasks**

1. Confirm the intended deployment platform/account and canonical hostname; do not guess a production URL.
2. Set the real `url` and `baseUrl` values. If deployed under a path, validate every docs asset and navigation route with that base URL.
3. Run `npm ci` and `npm run build` from `warg-docs`; repair broken absolute links or sidebar problems.
4. Deploy using the team-approved host process (for the existing Cloudflare configuration, validate Wrangler credentials/environment outside source control).
5. Link the deployed docs prominently from README and, if appropriate, the client footer/menu.
6. Manually verify the live home page, API docs, testing page and AI attribution page after deploy.

**Acceptance:** the docs URL is real, configured in source, linked from README, and loads current content without broken assets.

**Effort:** 1–2 hours plus deployment access.

### P1-4 — Remove binary cover images from `GET /api/args`

**Status:** Not addressed by Polish-F.

**Why it matters for scoring:** Live `GET /api/args` returned 5.6 MB for six ARGs because `cover_image` was serialized as a JSON Buffer. It made the home page fetch 2,062 KiB of 2,187 KiB total, with Lighthouse mobile LCP around 14 seconds. This suppresses API Performance, App Performance and UX marks simultaneously.

**Files likely involved — verify before editing**

- `server/src/controllers/argController.js`: public/list read handler.
- `server/src/models/Arg.js` and `database/schema.sql`: `cover_image` storage shape.
- `server/src/routes/argRoutes.js`: dedicated cover route.
- `client/scripts/components/GameCard.js`, `client/scripts/home.js`, `client/scripts/catalogue.js`: card rendering and image source selection.
- Tests: `server/tests/integration/args.test.js`, `client/tests/components/GameCard.spec.js`, `client/tests/home.spec.js`, `client/tests/catalogue.spec.js`.

**Implementation subtasks**

1. Profile the current list query and identify all responses that serialize Buffer/Blob columns. Do not fix cover images while leaving avatars with the same leak.
2. Define the API contract:
   - list endpoint returns `cover_url` or `has_cover`, never the binary column;
   - new `GET /api/args/:id/cover` returns the image with content type and cache headers; or store an external/path URL under P2-9.
3. Use explicit Sequelize `attributes` on list endpoints so `cover_image` cannot accidentally return.
4. Update card rendering to use `cover_url` and a stable lightweight fallback image/placeholder.
5. Validate image content type and missing-cover response (404 or default asset) at the cover endpoint.
6. Add server tests that ensure list responses contain no Buffer and stay under an agreed response-size budget with seeded data.
7. Add client tests for with-cover, without-cover and failed-cover image states.
8. Re-deploy and re-run Lighthouse on home/catalogue mobile and desktop.

**Acceptance:** list payload under 200 KB for the current catalog; no Buffer JSON appears in list APIs; home/catalogue mobile LCP under 4 seconds or an evidence-backed explanation is documented.

**Effort:** 3–5 hours; P2-9 may expand this if storage is moved.

### P1-8 — Create a release tag and submission release evidence

**Status:** Not addressed by Polish-F.

**Why it matters for scoring:** The project policy promises SemVer but the repository had no tags/releases. A release tag makes the assessed submission unambiguous.

**Dependencies:** Polish-F must be merged and the final verification suite must be green first.

**Subtasks**

1. Decide the exact submission commit.
2. Create an annotated tag such as `v1.0.0` on that commit.
3. Publish a Gitea release with honest notes: major features, deployment URLs, test command/results, known limitations, and the AI-attribution/docs links.
4. Push the tag and verify remote visibility with `git ls-remote --tags origin`.

**Acceptance:** a marker can identify the exact submission revision from the release page.

**Effort:** 20 minutes.

---

## 4. P2 — Remaining backend, deployment, and testing quality

### P2-1 — Mitigate or document Render cold starts

**Why it matters:** the first live API request took about 32.7 seconds because of the Render free-tier sleep behaviour. Availability and UX are penalized if a live demo appears broken.

**Subtasks**

1. Confirm the deployment plan: paid Render service, external uptime monitor, or a documented demo warm-up.
2. If using an uptime monitor, point it at the Polish-F `/health` endpoint and document the interval/owner.
3. Add a concise limitation statement in `warg-docs/docs/4-deployment/deployment-guide.md` that matches the chosen policy.
4. Measure first-request and warm-request times after deployment.

**Acceptance:** either first request completes reliably within the demo tolerance, or the documented procedure warms it before demonstration.

**Effort:** 30–60 minutes plus provider access.

### P2-3 — Add shared request validation

**Why it matters:** the fixed SQL injection and flag-auth defects came from controllers trusting raw request data. Repeating ad hoc checks creates regression risk.

**Files**

- Add `server/src/middleware/validate.js`.
- Add route schemas near `server/src/routes/argRoutes.js`, `gameRoutes.js`, `authRoutes.js`, `minigameRoutes.js` or in `server/src/validation/`.
- Update `argController`, `gameController`, `authController`, `minigameController` handlers.

**Subtasks**

1. Choose one library (`zod`, `joi`, or `express-validator`) and add it only to `server/package.json`; do not hand-roll incompatible schemas per route.
2. Implement a middleware that validates `params`, `query` and `body`, returning one documented 400 structure.
3. First cover high-risk inputs: geographic coordinates, waypoint/game IDs, flags, votes, ARG create/update payloads, auth/reset payloads and minigame submissions.
4. Require finite coordinate numbers with latitude/longitude ranges; cap strings/descriptions; restrict enums to schema-supported values.
5. Add negative tests for string injection, invalid enums, bad pagination values and oversized bodies.
6. Document the error response shape in API docs.

**Acceptance:** high-risk routes reject malformed payloads before their controllers; validation tests cover each schema.

**Effort:** 4–6 hours.

### P2-4 — Centralize API errors and unknown-route handling

**Why it matters:** controller-specific try/catch code yields inconsistent errors and can leak details when a new endpoint is written. There is no JSON API 404 or final error middleware.

**Files**

- `server/src/app.js`.
- New `server/src/middleware/errorHandler.js` and optional `asyncHandler.js`.
- All controllers incrementally, starting with `argController.js`, `gameController.js`, `authController.js`.

**Subtasks**

1. Define response shapes for validation (400), auth (401/403), missing resource (404), conflict (409), rate limit (429) and unexpected failure (500).
2. Add final `/api/*` not-found middleware and an Express error middleware after routes.
3. Keep full error details only in server logs; never send stack/error messages in production.
4. Introduce `asyncHandler` only if controller migration can be completed without mixing styles indefinitely.
5. Add integration tests for unknown API route and thrown async error.
6. Update API documentation examples.

**Acceptance:** unknown API path returns JSON 404; unhandled controller exception produces safe JSON 500; errors follow one documented contract.

**Effort:** 3–4 hours.

### P2-5 — Paginate list endpoints

**Why it matters:** unbounded lists are a future performance and availability problem, and directly contributed to oversized catalogue behaviour.

**Files**

- Read handlers in `argController.js`, `commentController.js`, `adminController.js`, and analytics/session list endpoints found through `findAll` review.
- Corresponding routes and client callers (`home.js`, `catalogue.js`, comments/admin/analytics scripts).
- API docs in `warg-docs/docs/6-api-reference/`.

**Subtasks**

1. Define one standard: `?page=1&page_size=20`, clamp `page_size` to 100, with `{ data, page, page_size, total }` responses.
2. Apply it first to ARG catalogue/list, comments, admin users/flags and creator analytics flags.
3. Update UI with clear “Load more”/pagination state, empty-state and error-state handling.
4. Add tests for default page, last page, invalid values and cap enforcement.
5. Document it consistently; do not claim all endpoints paginate until all applicable handlers do.

**Acceptance:** every externally exposed collection has bounded reads and documented parameters.

**Effort:** 4–6 hours.

### P2-6 — Remove N+1 game-condition queries and trim ORM selections

**Why it matters:** `evaluateConditions` executes queries inside loops, and public ARG queries include more data than cards need. This lowers API Performance as the dataset grows.

**Subtasks**

1. Instrument Sequelize logging locally and record query counts for a multi-waypoint game/session.
2. Fetch each required condition/attempt/result collection once, index it in memory and evaluate from maps rather than querying per condition.
3. Use explicit model `attributes` and minimal `include` associations in list/read handlers.
4. Add a regression test or query-count harness for representative state evaluation.
5. Re-measure endpoint timing/query count and document only measured gains.

**Acceptance:** game-condition evaluation query count grows by collection count, not by number of conditions.

**Effort:** 3–4 hours.

### P2-7 — Add rate limits and security headers

**Why it matters:** live API responses expose `x-powered-by: Express`; neither API nor Vercel frontend has a complete header policy; auth and reset routes can be abused without rate limits.

**Files**

- `server/src/app.js`.
- `server/package.json` for `helmet` / `express-rate-limit`.
- `vercel.json` for static-site headers.
- `server/src/routes/authRoutes.js`, `argRoutes.js`, `gameRoutes.js` for route-specific limiters.

**Subtasks**

1. Add `app.disable('x-powered-by')` and Helmet with an intentional JSON API policy.
2. Set `app.set('trust proxy', 1)` only after confirming Render proxy deployment, so IP limits use client addresses.
3. Add global and targeted rate-limit policies: strict on login/signup/forgot/reset; moderate on flags/votes/minigame submissions; document thresholds.
4. Reduce the general JSON body limit from 50 MB; leave image uploads to Multer/multipart endpoints with separate upload limits.
5. Add Vercel headers: CSP appropriate to external sources, `X-Content-Type-Options`, frame policy and referrer policy. Test that Google OAuth, map tiles, DiceBear, fonts and pinned QR script still function under CSP.
6. Test 429 responses and required headers.

**Acceptance:** no Express fingerprint header; protected responses include expected headers; brute-force/reset burst is rate-limited without breaking legitimate use.

**Effort:** 3–5 hours.

### P2-8 — Establish real schema migrations

**Why it matters:** `server/migrate_password_reset.js` and older ad hoc scripts are not a repeatable deployment history. Schema drift was already a project issue.

**Files**

- `database/schema.sql`.
- Existing `database/migrations/`.
- `server/migrate_password_reset.js`, `alter_enum.js`, `migrate_minigames_enum*.js`.
- `server/package.json`, CI workflow.

**Subtasks**

1. Select a migration runner compatible with Sequelize (`sequelize-cli` or Umzug).
2. Create a baseline migration strategy for a new database, then numbered migrations for password-reset fields and past enum/feature changes.
3. Make migrations idempotent or use migration metadata so deployed databases receive each change once.
4. Add `db:migrate`, `db:migrate:undo` and documented test/seed scripts.
5. Run migrations in CI before integration tests using the MySQL service database.
6. Retire or clearly mark one-off scripts after migration parity is verified.
7. Document developer and deployment migration commands.

**Acceptance:** blank CI database reaches the current schema only through migrations; a production-like existing database can be upgraded without manual scripts.

**Effort:** 1–2 days.

### P2-9 — Move media references out of list payloads / database buffers

**Why it matters:** cover-image binary data caused P1-4. Avatar `MEDIUMBLOB` data can create the same issue and database storage impairs caching/CDN delivery.

**Subtasks**

1. Choose storage within project constraints: managed object storage preferred; static/upload path only if deployment persistence is guaranteed.
2. Store URL/path + metadata in models, not raw image Buffer in list responses.
3. Add MIME validation, size limits and image endpoint cache headers.
4. Create a migration/backfill strategy for existing cover/avatar records.
5. Remove binary columns only after data migration and rollback plan are verified.
6. Update user/ARG serializers and test that no list response exposes Buffer data.

**Acceptance:** media loads by stable URL, list APIs remain small, uploads are validated, and existing media remains accessible.

**Effort:** 1–2 days.

### P2-10 — Make derived counters/state transactionally consistent

**Why it matters:** plays, completions, votes, ratings and future points are derived state. Without transaction boundaries, analytics can drift after partial failures or retries.

**Subtasks**

1. Map each counter to its source table/event and identify its update handler.
2. Wrap source write and counter update in one Sequelize transaction.
3. For points (if P3-8 is accepted), use an idempotent ledger rather than mutable totals alone.
4. Build a consistency-check script that recomputes counters and reports discrepancies; never auto-correct production data without approval.
5. Add transaction rollback and repeat-submission tests.

**Acceptance:** retry/failure cannot double-count votes, completions or points; consistency script has zero discrepancies on seed/test data.

**Effort:** 4–6 hours without points; more with P3-8.

### P2-12 — Curate production/demo data

**Why it matters:** live catalogue had test-looking entries such as “Games” and “Full set”. Markers judge the deployed product, not only code.

**Subtasks**

1. Use admin tools to unpublish/remove accidental test ARGs; preserve data only if it is meaningful demonstration content.
2. Curate 2–3 complete ARGs with cover, waypoints, a playable path and at least one representative minigame each.
3. Validate the catalogue/load order and mobile cards after P1-4.
4. Record demo accounts/steps privately; do not commit credentials.

**Acceptance:** public catalogue reads as intentional content and supports an end-to-end demo.

**Effort:** 1–3 hours.

### P2-13 — Fix layout shift and re-audit performance

**Why it matters:** desktop Lighthouse measured home CLS around 0.84; target is below 0.1. P1-4 will improve the cause, but card/grid stability needs direct handling.

**Files:** `client/styles/home.css`, catalogue/card styles, `GameCard.js`, home/catalogue scripts.

**Subtasks**

1. Reserve card/image dimensions using `width`/`height` or CSS `aspect-ratio`.
2. Render stable skeletons/placeholders before catalogue data resolves.
3. Give hero/grid regions a predictable minimum size.
4. Re-run mobile + desktop Lighthouse for home/catalogue after the payload change.
5. Record results with audit date/device assumptions; do not repeat the old unsupported “>90” claim.

**Acceptance:** CLS < 0.1 for home and catalogue in the recorded audit.

**Effort:** 2–3 hours.

### P2-15 — Add coverage gates and stable reporting

**Why it matters:** Polish-F makes server coverage collection more honest and CI runs mocked tests, but CI still has no threshold. Client coverage remains low and prior Monocart runs produced Firefox timing artifacts.

**Files:** `server/jest.config.js`, `.gitea/workflows/ci.yml`, `client/playwright.config.ts`, `warg-docs/docs/8-testing/testing.md`.

**Subtasks**

1. Obtain final post-Polish-F coverage figures with a reproducible command and archive/report the output outside ignored artifacts as appropriate.
2. Set conservative `coverageThreshold` values based on the verified baseline, then ratchet upward; do not set a threshold that existing tests cannot meet.
3. Make CI run coverage at least for the server suite and expose the summary in job output/artifact.
4. Separate client correctness runs from coverage runs if the reporter causes timeouts; serialize/reduce workers for coverage or collect Chromium-only coverage while retaining cross-browser correctness tests.
5. Update `testing.md` only with final measured numbers, suite count and command.

**Acceptance:** coverage regression fails CI; documentation reports reproducible, current figures; plain cross-browser tests remain green.

**Effort:** 3–4 hours.

### P2-16 — Implement pre-commit enforcement or keep the docs truthful

**Why it matters:** Polish-F correctly removed a false claim. A real hook improves quality only if it does not block the team during deadline work.

**Subtasks**

1. Decide whether the team wants Husky/lint-staged before submission.
2. If yes, configure `prepare`, staged ESLint and a fast targeted server test; document bypass policy and onboarding.
3. If no, leave docs accurate and rely on CI/PR checks; do not reintroduce the claim.

**Acceptance:** either hooks run successfully from a clean clone, or no documentation claims they exist.

**Effort:** 1–2 hours.

---

## 5. P3 — Remaining accessibility, UX, and advanced features

### P3-1 — Add skip navigation and modal focus management

**Why it matters:** Screen-reader and keyboard users need a fast route past repeated navigation and predictable modal focus.

**Files:** every page in `client/*.html`; modal components in `client/scripts/components/` including `MapModal.js`, `PlayModal.js`, `FlagModal.js`, `PublishModal.js`, `RemoveModal.js`.

**Subtasks**

1. Add a visually-hidden-until-focused “Skip to main content” link before navigation on each page.
2. Give each page one `<main id="main-content">` target.
3. On modal open, store triggering element, focus the dialog/first control and trap Tab navigation.
4. On close/Escape, return focus to the original trigger.
5. Add browser tests for keyboard-only modal open/close and skip-link destination.

**Acceptance:** keyboard navigation never enters hidden modal content; focus returns predictably; skip link reaches main content.

**Effort:** 4–6 hours.

### P3-2 — Resolve remaining Lighthouse accessibility failures

**Why it matters:** live audits found colour-contrast failures (35 on home, 21 on catalogue), `label-content-name-mismatch`, `aria-allowed-role`, `aria-hidden-focus`, heading-order and ARIA-child failures. Polish-F auth improvements do not resolve those page-level failures.

**Files:** `client/styles/` design-token files, home/catalogue markup/scripts, MapModal/card component markup.

**Subtasks**

1. Re-run Lighthouse/axe after Polish-F and export the failing node list for each page.
2. Map colour issues to shared CSS tokens; adjust tokens to WCAG AA (4.5:1 normal text, 3:1 large text) rather than one-off colours.
3. Make accessible names match visible labels; remove invalid roles; prevent focusable descendants of `aria-hidden` containers.
4. Correct heading hierarchy and child-role structure.
5. Add automated accessibility checks to key Playwright pages if feasible.

**Acceptance:** Lighthouse accessibility ≥95 on home, catalogue, login and signup; no critical axe violations on game flow.

**Effort:** 4–6 hours.

### P3-3 — Replace remaining native `alert()` / `confirm()` interactions

**Why it matters:** native dialogs interrupt assistive tools and make Playwright coverage runs fragile. The product still contains about 20 alert calls outside the removed Dev Override path.

**Files:** grep `alert(` and `confirm(` under `client/scripts/`; reuse/extend existing `window.confirmModal` implementation.

**Subtasks**

1. Inventory each alert/confirm and classify as error, status, destructive confirmation or authorization prompt.
2. Implement/reuse accessible toast (`role="status"` or `role="alert"`) and modal-confirm primitives.
3. Replace native calls incrementally, preserving error states and avoiding double notifications.
4. Test keyboard dismissal/focus return and update test guidance in `testing.md`.

**Acceptance:** no product code invokes native `alert()`/`confirm()`; user messages remain visible and announced.

**Effort:** 3–5 hours.

### P3-5 — Split large client scripts and extract inline presentation

**Why it matters:** `client/scripts/game.js` is roughly 1000 lines and `MapModal.js` is roughly 1300 lines. Inline template styles make feature work and testing harder.

**Subtasks**

1. Split `game.js` by responsibility: game bootstrap, waypoint/geofence flow, minigame orchestration, comments, and state/offline coordination.
2. Extract spinner/modal/comment styles into `client/styles/` classes.
3. Keep public APIs/import order stable; do not refactor and alter game rules in the same PR.
4. Repeat selectively for MapModal only after game split is stable.
5. Run targeted Playwright game/offline/comment tests after each module move.

**Acceptance:** modules have focused responsibilities; no behavioural regression; game tests remain green.

**Effort:** 1–2 days.

### P3-6 — Remove dead UI/assets and complete media UX

**Subtasks**

1. Identify unreferenced pages/scripts/styles via navigation and import search.
2. Remove or replace Lorem Picsum placeholders in authoring pages once P2-9 media paths are ready.
3. Remove OS artifacts only through normal source-control cleanup, not production runtime deletion.
4. Document `update_nav.py` if it remains the source of navigation consistency, or replace it with a maintainable shared strategy.

**Acceptance:** no user-facing placeholder imagery in final authoring/demo flows; navigation source is documented.

**Effort:** 2–4 hours.

### P3-7 — Complete responsive validation

**Subtasks**

1. Test catalogue, play, studio and analytics at 360×640, 768×1024 and desktop widths.
2. Fix overflow, text clipping and tap targets below 44 px.
3. Verify the map modal remains minimizable and usable after Polish-F merges.
4. Capture/update smoke-test evidence for meaningful final flows.

**Acceptance:** no horizontal overflow or inaccessible essential control in the tested flows.

**Effort:** 3–5 hours.

### P3-8 — Decide and resolve the points-economy claim

**Why it matters:** game replay copy refers to resetting “points,” but no points are awarded. This is a visible feature inconsistency.

**Decision required:** implement a minimal economy, or remove/replace the inaccurate copy before submission.

**If implementing:**

1. Prefer a `points_ledger` table (`user_id`, `delta`, `reason`, reference, timestamp) over only a mutable total.
2. Award points transactionally and idempotently when a minigame/ARG completion changes state.
3. Expose totals in profile/session summary and test retry/replay cannot farm points.

**If deferring:** update all points copy and docs to speak only about session progress.

**Acceptance:** user-facing wording exactly matches shipped behaviour.

**Effort:** 30 minutes to defer honestly; 1–2 days to implement.

### P3-9 — Make a final realtime/co-op scope decision

**Why it matters:** Polish-F correctly documents Socket.io as a stub. The app still exposes modes that may imply realtime collaboration.

**Option A — retain the honest scaffold (deadline recommendation):** hide/label realtime-dependent co-op features as unavailable, ensure docs/README say session tracking is not live synchronization, and add a known-limitation note.

**Option B — implement minimum viable co-op:** rooms keyed by session, authenticated join, server-authoritative completion broadcasts, throttled location updates, teammate map markers and two-context tests.

**Acceptance:** no claim suggests live synchronization unless an end-to-end test proves it.

**Effort:** 1–2 hours for Option A; 1–2 days for Option B.

### P3-10 / P3-11 — Notifications and recommendations

**Why it matters:** these were removed from promised feature lists, so they no longer block a truthful submission. They are optional improvements, not deadline work.

**Subtasks if elected after submission:**

- Notifications: VAPID configuration, subscription storage, service-worker `push` handler, explicit permission UX and notification tests.
- Recommendations: spatial nearby query / genre-based recommendation endpoint, explainable UI labels, privacy decision for location use and tests.

**Acceptance:** only add these back to docs once deployed and tested.

**Effort:** 1–2 days each.

### P3-13 — Final documentation completeness

**Subtasks**

1. Add/refresh a known-limitations page: cold starts, console fallback if still applicable, Socket.io scope, feature decisions.
2. Ensure API reference covers Polish-F routes (`/health`, `/auth/forgot`, `/auth/reset`, POST logout) and P1-4 endpoints once added.
3. Add final test/Lighthouse evidence only after a clean final run.
4. Include current desktop/mobile screenshots and user-feedback follow-up where appropriate.

**Acceptance:** no docs claim lacks evidence, and a marker can find architecture, API, testing, deployment, limitations and attribution quickly.

**Effort:** 3–5 hours after implementation stabilizes.

---

## 6. Recommended execution order

### Before merge

1. Complete the Polish-F final merge gate in Section 2.
2. Merge only through a reviewed PR with green CI.
3. Re-run the safe live probes: `/health`, unauthenticated flag (must be 401), test-file route (must be 404), public ARG payload size.

### Highest score return after merge

1. **P1-4** — fix ARG list payload and cover delivery.
2. **P1-1b** — finish password reset delivery/abuse controls/migration.
3. **P1-2b + P1-3** — real AI declaration and deployed discoverable docs site.
4. **P2-7** — rate limits and headers; reuse it for password-reset protection.
5. **P2-15** — final coverage gates and honest test evidence.
6. **P2-13 + P3-2** — final Lighthouse performance/accessible colour/ARIA cleanup.
7. **P1-8** — tag the verified final submission release.

### Parallelization guidance

| Track | Suitable items | Do not combine with |
|---|---|---|
| Server security/quality | P1-1b, P2-3, P2-4, P2-7, P2-8 | Simultaneous edits to the same auth/routes/app middleware files |
| API performance/media | P1-4, P2-5, P2-6, P2-9, P2-13 | Uncoordinated changes to ARG response shapes |
| Documentation/release | P1-2b, P1-3, P1-8, P3-13 | Publishing claimed results before final tests/deploys |
| Client quality | P3-1, P3-2, P3-3, P3-5, P3-7 | Large game.js refactor while gameplay rules are still changing |

---

## 7. Final verification matrix

Run this after every relevant merge and before tagging. Record results, commit SHA and audit date in the final docs/release notes.

| Area | Command or probe | Expected outcome |
|---|---|---|
| Server lint | `cd server; npm run lint` | Exit 0 |
| Mocked tests | `cd server; npm run test:mocked` | Exit 0 |
| Unit tests | `cd server; npm run test:unit` | Exit 0 |
| Integration tests | `cd server; npm run test:integration` | Exit 0 against test DB only |
| Client lint | `cd client; npm run lint` | Exit 0 |
| Client correctness | `cd client; npx playwright test --reporter=json` | All expected browser tests pass |
| Server coverage | `cd server; npx cross-env NODE_ENV=test jest --coverage --runInBand` | Meets configured threshold |
| Client coverage | `cd client; npm run test:ui` or configured coverage runner | Report produced; instability documented/fixed |
| Docs build | `cd warg-docs; npm run build` | Exit 0 |
| Health | `GET /health` | 200 `{ "status": "ok" }` |
| Auth flag guard | Unauthenticated `POST /api/args/:id/flag` | 401 |
| SQL regression | Invalid/string coordinate to domination ping | 400; no SQL exception/leak |
| Vercel exposure | `GET /tests/game.spec.js` | 404 |
| API payload | `GET /api/args` | No Buffer JSON; budget satisfied |
| Lighthouse | Home/catalogue/login/signup, mobile + desktop | Results recorded; performance/CLS/a11y targets met or candidly documented |
| Docs deployment | Public docs URL | Current build reachable, including AI attribution |

**Definition of done:** all remaining `[ ]` items deliberately completed, deferred honestly, or marked out of scope; every claim in the submission has a recorded verification result; Polish-F is merged through review; and `main` is tagged only after final checks pass.
