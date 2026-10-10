# IP-P1-1b — Complete Password Reset for a Deployed Application

**Register item:** MISSING_ITEMS.md §3, P1-1b (completes the partial Polish-F implementation P1-1)
**Prerequisites:** IP-00 (Polish-F merged — the minimal flow, `forgotPassword`/`resetPassword`, reset columns and `client/reset-password.html` only exist after that merge).
**Coordinates with:** IP-P2-7 (rate-limit infrastructure — either land P2-7 first or include its limiter in this PR), IP-P2-8 (repeatable migrations).
**Effort:** 3–5 hours, depending on SMTP availability.

## 1. What is missing and why it matters for scoring

The brief lists reset-password as a key requirement alongside sign-up/sign-in/delete-account. Polish-F delivers a *functional minimal* flow: `forgotPassword`/`resetPassword` in `server/src/controllers/authController.js`, `POST /auth/forgot` + `POST /auth/reset` in `server/src/routes/authRoutes.js`, `password_reset_token`/`password_reset_expires` columns in `database/schema.sql` and `server/src/models/User.js`, the one-off script `server/migrate_password_reset.js`, `client/reset-password.html` + `client/scripts/reset-password.js`, and a working link in `client/login.html` (previously `href="#"`).

What is still missing: (a) delivery beyond console-logging the link — not an end-user mechanism; (b) abuse controls (rate limiting, anti-enumeration guarantees); (c) a repeatable/idempotent database migration instead of a one-off script; (d) session policy after reset; (e) a single password-policy helper instead of three scattered length checks. Completing these turns a partial key requirement into a defensible production-style implementation.

## 2. Current state (verified)

- Token storage: `password_reset_token` (hash expected — verify Polish-F hashes with bcrypt/sha256 before trusting), `password_reset_expires` on `users`.
- Delivery: token link printed to the server console only.
- No rate limiters exist anywhere on the server (see IP-P2-7).
- `updateAccount` (Polish-F) verifies `current_password`; signup and reset each do their own ad-hoc length validation.

## 3. Implementation subtasks

1. **Team decision — delivery policy (record it in the PR description):**
   - *Submission-safe minimum:* SMTP via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) using Nodemailer.
   - *If no SMTP account is obtainable:* keep console delivery but label it an explicit development/demo fallback in `warg-docs/docs/7-frontend/system-flows.md` and the deployment guide — never claim it is email delivery.
2. **Mail adapter:** add `server/src/services/mailService.js`. Export `sendPasswordResetEmail(to, resetUrl)`. It builds transport from env, logs a full server-side error on failure, and the controller still returns the same generic response. In production (`NODE_ENV=production`) without SMTP configured, log an explicit configuration error — the user response must remain unchanged. Add `nodemailer` to `server/package.json` dependencies.
3. **Rate limits:** apply a strict limiter to `POST /auth/forgot` (e.g. 5 requests / 15 min / IP+email) and `POST /auth/reset` (e.g. 10 / 15 min). Reuse the limiter factory from IP-P2-7 if it has landed; otherwise implement it there-first or inline a minimal `express-rate-limit` setup consistent with that plan.
4. **Anti-enumeration:** ensure existing and nonexistent local emails return the identical status/message. Decide and test the message for Google-only accounts (recommend: same generic message; optionally add a distinct in-app hint only after login).
5. **Session policy:** after a successful reset, destroy the user's active sessions. The production session store is `express-mysql-session` (`server/src/app.js`, table auto-created). Implement `server/src/services/sessionService.js` with `destroyUserSessions(userId)` deleting rows for that user (or store a per-user session-version claim if you prefer invalidation without table access — but document the choice).
6. **Repeatable migration:** fold `server/migrate_password_reset.js` into the migration runner established by IP-P2-8. The migration must be idempotent (`ADD COLUMN IF NOT EXISTS` semantics or a check query) and deployable to the non-empty production database. Keep `database/schema.sql` in sync.
7. **Password policy helper:** add `server/src/utils/passwordPolicy.js` exporting `validatePassword(pw)` (min length ≥ 8; consider complexity message). Use it in signup (`authController.signup`), `updateAccount`, and `resetPassword`, replacing the local checks.
8. **Docs:** update `warg-docs/docs/6-api-reference/auth.md` (request/response, generic-response security behaviour, 429s) and `warg-docs/docs/7-frontend/system-flows.md` (reset flow diagram in prose).

## 4. Required tests

Extend the existing suites (do not create parallel files):

- `server/tests/controllers/authController.test.js`:
  - unknown vs existing local email → indistinguishable public response;
  - Google-only account → same generic response (decision from subtask 4);
  - stored token is a hash; raw token never persisted;
  - token expires after configured TTL and is single-use (second use fails);
  - successful reset updates the bcrypt hash and a subsequent local login succeeds;
  - password-policy helper rejects short passwords at all three call sites.
- `server/tests/routes/authRoutes.test.js`: limiter returns 429 past threshold; mail adapter called with expected reset URL when configured.
- `server/tests/integration/auth.test.js`: full forgot→reset→login round trip against the `warg_test` database; sessions invalidated after reset (old session cookie no longer authorizes).

## 5. Acceptance criteria

- A real recipient can complete reset end-to-end through the deployed UI (SMTP configured) — or the console fallback is explicitly documented as such.
- No raw token stored or exposed in any response/log at `info` level.
- Forgot/reset are rate-limited; responses are enumeration-safe.
- `npm run test:mocked`, `test:unit`, `test:integration` all pass; `npm run lint` clean.

## 6. Verification without breaking existing functionality

```powershell
cd server; npm run lint; npm run test:mocked; npm run test:unit; npm run test:integration
```

- Local manual flow: run server locally (`NODE_ENV=development`), request reset from `client/login.html` → follow console link → set new password → log in with it → confirm old sessions dead.
- Live verification (after deploy, read-only except the reset itself performed by a team member on a test account): `POST /auth/forgot` with a fake email returns the generic 200; rapid repeats return 429.
- Rollback: revert the PR; the Polish-F minimal flow remains (it was merged first), so reset never regresses below its current state.

## 7. Safety notes

- Integration tests touch only the `warg_test` database (via `server/.env.test`).
- The production migration runs **after** a manual backup/snapshot of the Aiven database; it is additive (`ADD COLUMN`) and idempotent.
- Never commit SMTP credentials; only env-var names appear in code/docs.
