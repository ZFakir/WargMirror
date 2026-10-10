# IP-P2-5 — Pagination on List Endpoints

**Register item:** MISSING_ITEMS.md §3, P2-5 (pagination for large collections)
**Prerequisites:** IP-00. Order: after IP-P1-4 (that fix shrinks each row; this fix shrinks row count).
**Effort:** 3–4 hours.

## 1. What is missing and why it matters for scoring

All list endpoints return complete, unpaginated collections. With only 6 ARGs the payload is already 5.6 MB (BLOB leak, fixed separately by IP-P1-4); with 60 ARGs it would be unusable. There is no `limit`/`offset`/`page` handling on any list route, which a marker will check for explicitly ("pagination implemented for large datasets"). It is also the natural companion to the P2-13 client-side pagination.

## 2. Current state (verified)

- `GET /api/args` (`argController.js` getAllArgs, L7-13 area) — no limit; returns all rows with associations.
- `GET /api/sessions`, game/minigame list endpoints — same pattern (no pagination params read anywhere in `server/src/controllers/`).
- Client pages (`client/home.html` + `client/scripts/` home/game-catalogue rendering) call the list APIs once and render every returned card via `GameCard.renderRow(...)`.
- No query-param validation exists (ties into IP-P2-3 schemas).

## 3. Implementation subtasks

1. **Choose the contract**: cursor-free offset pagination is fine at this scale. Standard shape:
   - Request: `?page=1&pageSize=12` (default `page=1`, `pageSize=12`, cap `pageSize` at 50).
   - Response: `{ items: [...], page, pageSize, total, totalPages }` — keep the existing array fields working during transition (see subtask 4).
2. **`server/src/controllers/argController.js` — `getAllArgs`**: read validated `page`/`pageSize`, add `limit`/`offset` to the Sequelize findAll, run a `count()` query for `total`. Include only the light attributes established by IP-P1-4 (no BLOBs).
3. **Apply to every list endpoint**: sessions list (`sessionController.js`), minigames list, admin lists (`adminController.js`), flags list, friends/search endpoints in `userController.js` that return arrays. One shared helper (`server/src/utils/paginate.js`: `parsePageParams(query)` → `{ limit, offset, page, pageSize }`) keeps behavior uniform.
4. **Client updates** (only where these lists render):
   - `client/scripts/api.js` — pass `page`/`pageSize` through on list calls; expose the full envelope to callers.
   - Catalogue/home rendering (`client/scripts/pages/` home + catalogue modules): render the `items` array, and wire the existing pagination UI (or add a simple pager: prev/next + page numbers) using `totalPages`.
   - `GameCard.renderRow` needs no change — it already takes an array.
5. **Backwards-compat decision**: because the client and tests are updated in the same PR, change the response shape outright rather than dual-supporting; note the breaking change in the PR description. Any external consumer is out of scope for this milestone.
6. **IP-P2-3 schema**: add a shared `paginationQuerySchema` (`page: int().min(1)`, `pageSize: int().min(1).max(50)`) applied to GET list routes.

## 4. Required tests/checks

- Jest unit/mocked: `?page=2&pageSize=5` returns rows 6-10 and correct `total`/`totalPages`; out-of-range page returns empty `items` (not an error); `pageSize=9999` is capped at 50; invalid `page=abc` → 400 (post-IP-P2-3).
- Integration: seed >1 page of rows in `warg_test` (test fixtures only), verify counts.
- Client Playwright: catalogue pager navigates pages; per-page card count matches `pageSize`.
- `npm run lint`; full server suite green.

## 5. Acceptance criteria

- Every list endpoint accepts `page`/`pageSize` and returns the envelope shape.
- Page size capped; total/page metadata accurate (asserted by tests).
- Client catalogue paginates server-side instead of rendering everything.

## 6. Verification without breaking existing functionality

- Compare old vs new payloads locally: same first-page items, correct counts.
- All existing tests updated deliberately where they asserted full-array responses.
- GET-only live probes confirm envelope shape; no write paths touched.

## 7. Safety notes

- Pure read-path change; the risk is response-shape breakage, mitigated by updating client + tests in the same PR.
- Never run the seed script against production to "test pagination with more data" — use the `warg_test` DB or in-test fixtures only.
- Keep `count()` on the same WHERE filters as the findAll, or page metadata will lie.
