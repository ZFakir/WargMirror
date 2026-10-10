# IP-P2-3 — Server-Side Request Validation

**Register item:** MISSING_ITEMS.md §3, P2-3 (validate all external input)
**Prerequisites:** IP-00 (merge Polish-F). Recommended after IP-P2-4 so error responses follow one contract.
**Effort:** 4–6 hours.

## 1. What is missing and why it matters for scoring

Every endpoint trusts client-supplied data. Body/query parameters are destructured and passed straight into Sequelize queries or used as values without type/range/shape checks. A marker probing with malformed payloads (e.g. `play_count: "abc"`, `id: { "$gt": 1 }`, or missing fields) can trigger 500s, unexpected query behavior, or writes of garbage data. Systematic validation demonstrates robustness — a named rubric criterion — and interacts directly with P2-4 (error handling) and P2-7 (rate limiting).

## 2. Current state (verified)

~25 destructuring sites, all unvalidated:

- `server/src/controllers/gameController.js` — L168, L217, L484
- `server/src/controllers/authController.js` — L7, L65, L86
- `server/src/controllers/argController.js` — L92, L175, L345, L387, L411, L436, L459, L568
- `server/src/controllers/sessionController.js` — L7, L40
- `server/src/controllers/minigameController.js` — L11, L47, L69, L88
- `server/src/controllers/userController.js` — L82, L108, L191-192
- `server/src/controllers/adminController.js` — L57

`server/package.json` currently has **no** validation library (checked: no zod, joi, express-validator, yup). Multer upload size caps exist on routes (`argRoutes.js:15-16`, `minigameRoutes.js:9`, `aiRoutes.js:7-8`), which are the only input constraints today.

## 3. Implementation subtasks

1. **Pick one library and install it in `server/`** (add to `server/package.json` dependencies):
   - Recommended: `zod` (schema-first, small, TS-compatible if the codebase ever migrates; also reusable in tests).
   - Alternative: `express-validator` if the team prefers per-route chained middleware.
   - Decision is a one-line change; document the choice in this plan file's PR description.
2. **Create `server/src/middleware/validate.js`** exporting a factory:
   - `validate(schema)` → middleware that parses `req[schema.source]` (body | query | params), calls `schema.parse()`, replaces `req[source]` with the parsed (typed) value, and forwards `ZodError`/`ValidationError` via `next(err)` so P2-4's error middleware renders it as a 400/422 with a field-level message.
   - Failure mode must be 400 with `{ error: "...", fields: [...] }` — never a 500, never a stack trace.
3. **Define schemas.** New file `server/src/validators/` (one file per controller, e.g. `validators/arg.js`) covering at minimum:
   - **IDs** — all `:id`/`:argId` params: coerce to integer, `int().positive()`.
   - `POST /api/auth/signup` — email format, password min length (match whatever `authController.js` enforces manually today), username rules.
   - `POST /api/auth/login` — email + password required strings.
   - `POST /api/args`, `PUT /api/args/:id` — title/caption length caps, mode enum, published boolean.
   - `POST /api/args/:id/vote` — vote value enum (`like`/`dislike` or null for unvote).
   - `POST /api/args/:id/flag` — reason string length cap.
   - `PUT /api/minigames/:id` — `play_count`/`completion_count`: `int().min(0)` (currently garbage-able per P2-10).
   - `POST /api/sessions` — session payload shape per `sessionController.js:7/40` usage.
   - `gameController.js` L168/L217/L484 sites — minigame config/eval payloads; enforce the shape `evaluateConditions` expects (ids as ints, condition objects with known operators).
   - `adminController.js:57` — admin action params.
4. **Apply middleware in routes** (`server/src/routes/*.js`): insert `validate(...)` between `requireAuth`/permission middleware and the controller on every non-GET route. Keep GET routes' query params validated too where they are used (e.g. any search/filter params).
5. **Do not double-validate**: where a controller currently hand-checks a field (e.g. missing-field 400s), remove the redundant manual check once the schema covers it, to keep one source of truth.

## 4. Required tests/checks

- New negative tests in the affected Jest projects (server `tests/`): for each schema, at least one test sending a wrong type, an out-of-range value, and a missing field → expect 400 and `fields` array in response, expect **no** 500s.
- Re-run existing suites: `npm run test:mocked`, unit, and integration must stay green (existing tests send valid payloads, so they should pass unchanged — any that break reveals a schema that is stricter than the real client; fix the schema or the client, deliberately).
- `npm run lint` in `server/` (after IP-00; currently blocked pre-merge).
- Manual probe (GET-only + a few safe POSTs against local dev): send `{"play_count": "not_a_number"}` to the minigame update route → 400.

## 5. Acceptance criteria

- Every non-GET route runs through a validation middleware; malformed payloads return 400 with a machine-readable field list.
- No endpoint returns a 500 for malformed client input (verified by the negative tests).
- All pre-existing tests pass without weakening assertions.

## 6. Verification without breaking existing functionality

- Full server test matrix locally: unit, mocked, integration (against `warg_test` only — `.env.test` already points there).
- Live-site verification limited to read-only GET probes plus the same malformed-payload POSTs a marker would try (they are rejected before any write occurs).
- Rollback: reverting the branch removes middleware; no schema/data migration involved.

## 7. Safety notes

- Validation middleware runs **before** controllers, so rejected requests never reach the database — this item reduces risk rather than adding it.
- Never loosen a schema to make a failing legacy test pass without confirming the client actually sends that shape; check the client call site first.
- No database migrations required; pure application-layer change.
