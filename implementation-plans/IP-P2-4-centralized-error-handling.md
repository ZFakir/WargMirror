# IP-P2-4 — Centralized Error Handling

**Register item:** MISSING_ITEMS.md §3, P2-4 (error-handling middleware + consistent error contract)
**Prerequisites:** IP-00. Best done **before** IP-P2-3 so validation errors render through the new contract.
**Effort:** 3–4 hours.

## 1. What is missing and why it matters for scoring

Error responses are produced ad hoc per controller: `res.status(500).json({ error: ... })` in some places, bare `console.log(err)` with a hang or unhandled rejection in others, and 500s where the client did something wrong (should be 400). There is no Express error-handling middleware, so thrown errors from `async` controllers fall through to Express's default HTML error page — which also leaks stack traces in non-production and gives the client no parseable contract. Consistent, well-structured error handling is a named rubric criterion ("errors handled systematically") and is trivially testable by markers.

## 2. Current state (verified)

- No `app.use((err, req, res, next) => ...)` error middleware exists in `server/server.js` or `server/src/`.
- Controllers catch errors locally with inconsistent shapes (e.g. `argController.js` voteArg recount at L373-376, upload handlers L434-455).
- Some `async` controller functions pass errors to `next` implicitly on rejection; without an error middleware these become default Express 500 HTML responses.
- Sequelize errors (unique-constraint, FK violations) are not mapped to meaningful status codes anywhere.
- The known knowledge card "Error Handling Across WARG Platform Services" documents this as an intentional-but-weak per-service ad-hoc pattern — this item upgrades it to a systematic one.

## 3. Implementation subtasks

1. **Create `server/src/middleware/errorHandler.js`** with two pieces:
   - `notFoundHandler` — final `app.use((req, res) => res.status(404).json({ error: 'Route not found' }))`.
   - `errorHandler(err, req, res, next)` — maps error classes to status/shape:
     - `ZodError`/validation → 400 with `{ error, fields }` (from IP-P2-3).
     - Sequelize `UniqueConstraintError` → 409; `ForeignKeyConstraintError` → 409 or 400; empty `findOne` results handled by controllers stay as-is (404s already exist in places).
     - `MulterError` (file too large / wrong type) → 400/413 with a clean message.
     - Everything else → 500 with generic `{ error: 'Internal server error' }`; log the real error server-side with `console.error` including route + method, and include `err.stack` **only** when `NODE_ENV !== 'production'`.
2. **Add an `AppError` class** (`server/src/utils/AppError.js`): `class AppError extends Error { constructor(status, message) }`. Controllers throw `new AppError(403, '...')` for expected business-rule failures instead of hand-rolling `res.status(...)` everywhere. Migrate the highest-traffic controllers first: `argController.js` (vote/flag/upload), `authController.js`, `minigameController.js`.
3. **Wrap async controllers** so rejections reach the middleware: either add an `asyncHandler(fn)` wrapper util (`server/src/utils/asyncHandler.js`) or convert route handlers to pass errors explicitly. Apply to every controller file; this is mechanical.
4. **Register middleware last** in `server/server.js`: after all routes, `app.use(notFoundHandler); app.use(errorHandler);` — order matters.
5. **Normalize existing ad-hoc responses**: sweep controllers for `res.status(4xx/5xx).json(...)` and replace with `AppError` throws where the response shape was hand-built; keep response field names consistent (`{ error: string, fields?: [...] }`).

## 4. Required tests/checks

- New Jest tests: a route that throws unexpectedly returns 500 JSON (not HTML); a validation failure returns 400 with `fields`; a 404 on an unknown route returns JSON; Sequelize unique violation returns 409.
- Full server suites stay green (existing tests may assert on specific `res.status` calls — update those assertions to the new contract where the code path moved, never by weakening coverage).
- `npm run lint` (post-IP-00).
- Manual: `curl` an unknown route and a failing endpoint; confirm JSON responses and that production mode hides stack traces.

## 5. Acceptance criteria

- One error-handling middleware registered; all thrown/async errors reach it.
- Response contract is uniform: `{ error: string }` plus optional `fields` array; no Express HTML error pages on API routes.
- Stack traces never appear in production responses.
- Sequelize constraint errors map to sensible 4xx codes.

## 6. Verification without breaking existing functionality

- Run unit + mocked + integration suites locally against `warg_test`.
- Smoke-check the client: every fetch path in `client/scripts/api.js` already handles non-2xx; spot-check login failure and a 404 game page still show sensible UI (client mostly checks `res.ok`, so JSON-vs-HTML changes are safe, but verify the auth failure path on `login.html`).
- Rollback: single-file revert of middleware registration restores prior behavior.

## 7. Safety notes

- Application-layer only; no migrations, no seeds.
- Do not change HTTP success shapes — only error paths. Client code that branches on `res.success` (e.g. `GameCard.js` vote handler) is untouched.
- Ensure `errorHandler` is registered **after** routes but **before** `app.listen` concerns; a misplaced registration silently disables it.
