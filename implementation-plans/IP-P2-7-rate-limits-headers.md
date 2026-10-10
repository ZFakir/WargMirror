# IP-P2-7 — Security Headers + Rate Limiting

**Register item:** MISSING_ITEMS.md §3, P2-7 (helmet headers, rate limiting on auth/write routes)
**Prerequisites:** IP-00. Independent of other items; safe to run in parallel with P2-3/P2-4.
**Effort:** 3–5 hours.

## 1. What is missing and why it matters for scoring

Live probing confirmed the API sends **no** `Content-Security-Policy`, `X-Frame-Options`, or similar hardening headers, and there is no rate limiting — an attacker can brute-force login or spam write endpoints (vote/flag/upload) indefinitely. Both are explicit rubric/security criteria ("security best practices", "rate limiting on sensitive routes"). They are cheap, standard, and highly visible to any marker running a header check or a burst request.

## 2. Current state (verified)

- `server/package.json` — no `helmet`, no `express-rate-limit` dependency.
- `server/server.js` — no header middleware; CORS is configured manually.
- Live probes (`wargmirror.onrender.com`): no CSP/X-Frame-Options on API responses; frontend on Vercel sends platform defaults only.
- Auth routes (`server/src/routes/authRoutes.js`) and write routes (vote/flag/upload in `argRoutes.js`, minigame update) have no throttling; login failure responses are identical for wrong-password vs unknown-user (good — keep that).
- Client is a static SPA served by Vercel (`client/vercel.json`) — headers for static assets belong in `vercel.json` `headers`, not helmet.

## 3. Implementation subtasks

1. **Install** `helmet` and `express-rate-limit` in `server/` (`npm install helmet express-rate-limit` inside `server/`; commit both `package.json` + `package-lock.json`).
2. **`server/server.js`**: `app.use(helmet())` early, before routes. Keep `crossOriginResourcePolicy` compatible with the Vercel-served client (adjust to `cross-origin` if the SPA calls the API cross-origin — it does: vercel.app → onrender.com).
3. **Rate limiters** (`server/src/middleware/rateLimits.js`):
   - `authLimiter` — `windowMs: 15 min, max: 20` per IP → applied to `POST /api/auth/login` and signup (and the future password-reset endpoints from P1-1b).
   - `writeLimiter` — `windowMs: 1 min, max: 60` per IP+user → applied to vote, flag, upload, minigame update, friend-request endpoints.
   - Return 429 with a JSON body matching the IP-P2-4 contract (`{ error: 'Too many requests, try again later.' }`) via a custom `handler`.
   - Skip limiting in the `test` environment (Jest supertest runs many requests fast) via `skip: () => process.env.NODE_ENV === 'test'`.
4. **Static-frontend headers** in `client/vercel.json`: add a `headers` block — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a **practical** CSP (`default-src 'self'` + allowances for the Google Fonts/CDN origins the client actually uses; start in `Content-Security-Policy-Report-Only` if unsure, then enforce — verify no console violations first).
5. **Docs**: note the limits in `warg-docs` API reference (rate-limit response + headers) if a security/deployment page exists.

## 4. Required tests/checks

- Jest: 429 returned after exceeding the (test-configured, tiny) limit; headers present on a normal response (`expect(res.headers['x-content-type-options'])` etc.).
- Full server suites green with limiting skipped under test env.
- Manual live probe: `curl -I https://<api>/api/args` shows helmet headers; burst 25 login attempts → 429s.
- Client Playwright smoke: pages still load with new CSP (no blocked scripts/fonts).

## 5. Acceptance criteria

- Helmet headers on all API responses; security headers on the Vercel-served client.
- Login/signup and key write endpoints rate-limited with 429 responses in the standard error contract.
- Test suite unaffected (limiter skipped or configured for tests).

## 6. Verification without breaking existing functionality

- The client uses cookie-based auth and same-origin-friendly fetch; confirm session flows (login → home → vote) end-to-end after helmet (CORS/COOP/COEP defaults are the usual breakage — helmet's defaults are safe here, but verify).
- Playwright full run to catch CSP breakage (use `--reporter=json`; the HTML reporter hangs — known environment issue).
- Rollback: removing two `app.use` lines and the `vercel.json` block restores prior behavior.

## 7. Safety notes

- Do not enable COEP/COOP strict headers without checking the cross-origin API calls — they can silently break fetches.
- Never log full request bodies in the limiter handler (credentials live in login bodies).
- `vercel.json` header changes deploy on merge — validate the JSON (Vercel rejects malformed config and fails the deploy) before pushing.
