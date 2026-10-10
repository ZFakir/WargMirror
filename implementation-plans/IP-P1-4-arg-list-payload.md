# IP-P1-4 — Remove Binary Cover Images from `GET /api/args`

**Register item:** MISSING_ITEMS.md §3, P1-4 (highest score return in §6)
**Prerequisites:** IP-00 (Polish-F merge) recommended so client specs and `/health` exist, but the core fix is server-side and safe to land independently.
**Coordinates with:** IP-P2-13 (CLS — image dimensions), IP-P2-9 (media storage — later expansion), IP-P2-5 (pagination — ARG list contract).
**Effort:** 3–5 hours.

## 1. What is missing and why it matters for scoring

Live `GET /api/args` returned **5.6 MB for six ARGs** because `cover_image` (a `MEDIUMBLOB`) and user avatars serialize as JSON Buffers. The home page transferred 2,062 KiB of its 2,187 KiB total from this one endpoint, with Lighthouse mobile LCP around 14 s. This suppresses API Performance, App Performance and UX marks simultaneously — the register rates it the single highest score return after the Polish-F merge.

## 2. Current state (verified)

- `server/src/controllers/argController.js:7-13` — `getAllArgs` uses no `attributes` on `Arg` and includes `Creator` with `attributes: ['username', 'avatar']`; `User.avatar` is a BLOB (`server/src/models/User.js:11`), so both binary columns are serialized per row.
- `server/src/controllers/sessionController.js:24` — recent-session responses include `Arg` with `attributes: ['title', 'caption', 'cover_image']`: a second leak that must be fixed in the same PR.
- `server/src/models/Arg.js:10` — `cover_image: DataTypes.BLOB('medium')`.
- `server/src/controllers/argController.js:457-472` — `getCoverImage` hard-codes `Content-Type: image/jpeg` and sets no cache headers; `:466`.
- `client/scripts/api.js:101-104` — the client **already builds** card image URLs as `{API_BASE}/api/args/{arg_id}/cover-image` when `cover_image` is truthy, with a comment noting the Buffer problem. `client/scripts/edit_warg.js:87-91,873-881` does the same.
- `client/scripts/components/GameCard.js:164-166` — `<img loading="lazy">` without width/height (CLS; handled in IP-P2-13).
- Cover upload: `argRoutes.js:15-16` multer `memoryStorage()` (verify the file filter/size limit while editing).

## 3. Implementation subtasks

1. **Define the API contract** (write it down in the PR and later in API docs):
   - List/read endpoints return `has_cover: boolean` (or `cover_url` string) — never the binary column.
   - `GET /api/args/:id/cover-image` stays the binary delivery route, with correct content type and cache headers.
2. **`argController.getAllArgs`:** add explicit `attributes` excluding `cover_image`; replace Creator `avatar` with a boolean/`avatar_url` (avatars currently render from DiceBear seeds client-side — see `game.js` comment-avatar code, so no avatar bytes are needed at all). Add `has_cover` to the mapped output.
3. **`sessionController.js:24`:** drop `cover_image` from the include attributes; the client can request covers per ARG id.
4. **Audit every other serializer** before merging: `Select-String -Path server/src/controllers/*.js -Pattern 'cover_image','avatar'` — fix all remaining list-path leaks, not just the two known ones.
5. **`getCoverImage` (`argController.js:457-472`):** return 404 JSON when missing (already does); add `Cache-Control: private, max-age=300` (covers can be replaced, so not `immutable`); either store/return the real MIME type (preferred: add `cover_image_mime` column via the IP-P2-8 migration path — additive only) or sniff magic bytes from the buffer as a fallback.
6. **`uploadCoverImage` (`argController.js:434-455`):** validate MIME (jpeg/png/webp) and enforce a size cap in the multer config at `argRoutes.js:15-16`.
7. **Client:** `api.js:101-104` switches from `arg.cover_image` truthiness to `arg.has_cover` (or `cover_url`); `edit_warg.js:87` same; keep a stable fallback (emoji/gradient placeholder) for ARGs without covers.

## 4. Required tests

- Server integration (`server/tests/integration/args.test.js`): list response contains no `cover_image`, no Buffer/`type: Buffer` JSON, includes `has_cover`; response-size assertion under 200 KB with seeded data; `GET /api/args/:id/cover-image` returns 200 with image content type for covered ARGs and 404 otherwise; session-history endpoint also free of binary fields.
- Unit (`server/tests/controllers/`): `getAllArgs` mapping (vote attribution preserved — do not regress the `user_vote` logic at `argController.js:15-20`).
- Client (post-IP-00 specs): `GameCard`/home/catalogue render with-cover, without-cover, and failed-cover (broken URL → fallback) states.

## 5. Acceptance criteria

- `GET /api/args` payload under 200 KB for the current catalogue and contains no Buffer JSON anywhere.
- Home/catalogue cards still show covers exactly as before for end users.
- Mobile home LCP under 4 s in a re-run Lighthouse audit, or a candid evidence-backed explanation is recorded (ties into IP-P2-13).

## 6. Verification without breaking existing functionality

- Full server matrix: `npm run lint`, `test:mocked`, `test:unit`, `test:integration` (integration only against the `warg_test` DB).
- Client: `npx playwright test --reporter=json` (post-IP-00) — home/catalogue specs must stay green.
- Live probe after deploy (read-only): measure `GET /api/args` content length before/after; open home in DevTools Network tab and confirm the multi-MB fetch is gone.
- Rollback: single PR revert restores the old behaviour; no schema change is required for the minimal fix (adding `cover_image_mime` is additive and nullable, so rollback is safe).

## 7. Safety notes

- **Read-path change only for the minimal fix** — the BLOB column stays in the schema; nothing is dropped, no data is migrated, no destructive SQL.
- If `cover_image_mime` is added, it is an additive nullable column applied through the IP-P2-8 migration runner against `warg_test` first; production gets the same migration only after a backup/snapshot.
- Do not run `sync({ force: true })` or any table recreate to "clean up" — ever.
