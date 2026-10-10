# IP-P2-9 — Media Storage Externalization (BLOBs → Object Storage)

**Register item:** MISSING_ITEMS.md §3, P2-9 (move images out of the database)
**Prerequisites:** IP-00, IP-P1-4 (URL contract + `has_cover` already shipped), IP-P2-8 (migration framework for new columns). This is the structural fix behind P1-4's symptom.
**Effort:** 1–2 days.

## 1. What is missing and why it matters for scoring

ARG cover images and user avatars are stored as `BLOB('medium')` columns (`server/src/models/Arg.js:10`, avatar column on the user model) and were measured serializing a 5.6 MB JSON response for 6 ARGs. BLOBs in rows bloat every join/backup, defeat caching, and keep the payload problem alive even after IP-P1-4 stops *sending* them. The rubric explicitly rewards "appropriate media handling / storage strategy"; object storage (or at minimum disk + static serving) with the DB holding only URLs is the standard answer a marker expects to see.

## 2. Current state (verified)

- `Arg.js:10` — `cover_image: DataTypes.BLOB('medium')`; avatar BLOB on User (seen serialized via include in `getAllArgs`, `sessionController.js:24`).
- `argController.js:434-455` `uploadCoverImage` — multer `memoryStorage` (`argRoutes.js:15-16`), writes buffer straight into the column; `getCoverImage` L457-472 serves it back with hard-coded `image/jpeg` at L466.
- `play_count`-style analytics columns exist but no media-URL columns.
- Client already knows how to render URL covers: `client/scripts/api.js:101-104` builds cover-image URLs and `GameCard.js:164-166` renders `<img src=... loading="lazy">`.
- No S3/Cloudinary/Supabase-Storage dependency anywhere; deployment is Render (server) + Vercel (static client), so a free-tier S3-compatible bucket (Cloudflare R2, Supabase) or Render Disk are the realistic options. Render's ephemeral filesystem means **local disk is not viable** without a persistent disk add-on.

## 3. Implementation subtasks

1. **Pick a backend** (decision recorded in PR): recommended **Cloudflare R2** (S3-compatible, zero egress cost, free tier) with the `@aws-sdk/client-s3` npm package; alternative Supabase Storage. Required env vars: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL`.
2. **Migration (via IP-P2-8)**: `ALTER TABLE args ADD COLUMN cover_image_url VARCHAR(512) NULL`, `ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL`. Keep the BLOB columns for now (see subtask 5).
3. **New module `server/src/services/mediaStorage.js`**: `uploadBuffer(key, buffer, contentType)` → returns public URL; `deleteKey(key)`. Wire content-type detection from the uploaded file (fixes the hard-coded `image/jpeg` at `argController.js:466` by storing the real MIME at upload time — also add an optional `cover_image_mime` column in the same migration if serving through the old route during transition).
4. **Controllers**:
   - `uploadCoverImage` (argController.js:434-455): store to object storage, persist `cover_image_url`, keep `has_cover = true`.
   - Avatar upload in `userController.js` (L82/L108 area): same pattern → `avatar_url`.
   - `getCoverImage` (L457-472): prefer 302-redirect/serve from `cover_image_url` when present; fall back to BLOB for unmigrated rows.
   - `getAllArgs` / `sessionController.js:24`: ensure no BLOB attributes are selected and URLs come from the new columns (IP-P1-4 contract stays intact).
5. **Backfill + cutover** (separate step, separate deploy): a one-off script `server/scripts/backfill-media.js` reads BLOBs, uploads them, sets `cover_image_url`/`avatar_url`, run once against production **after** backup. Only after backfill completes and is verified do you (optionally, later milestone) drop the BLOB columns — never in this PR.
6. **Client**: no changes needed for covers/avatars beyond what IP-P1-4 shipped; verify `api.js` URL builder points at the new public base.
7. **Config docs**: document env vars in `.env.example` (create if missing), `warg-docs` deployment guide, and README.

## 4. Required tests/checks

- Mocked unit tests for `mediaStorage.js` (stub S3 client); controller tests asserting `cover_image_url` is set and BLOB column is not written on new uploads.
- Integration on `warg_test` with a local S3 stand-in (e.g. `minio` in CI or mocked) — full upload → URL → GET round trip.
- Existing suites green; `npm run lint`.
- Manual: upload a PNG cover on a dev ARG, confirm it renders on home/catalogue cards, confirm `GET /api/args` payload stays sub-200 KB.

## 5. Acceptance criteria

- New uploads never touch BLOB columns; URLs served from object storage with correct MIME types.
- `GET /api/args` payload unchanged from the IP-P1-4 acceptance (< 200 KB).
- Old BLOB rows still render (fallback path) until backfill runs.

## 6. Verification without breaking existing functionality

- Deploy with dual-read (URL → BLOB fallback) so the live site never breaks for unmigrated rows.
- Run backfill script first against `warg_test` with fabricated BLOB rows; count-check before/after.
- Production backfill only with a fresh backup, and verified by re-fetching a sample of ARGs/avatars on the live site.

## 7. Safety notes

- The BLOB columns are **not dropped** in this item — dropping data is a separate, later, fully-backed-up decision.
- Bucket policy: public-read only on the media prefix; never expose write credentials client-side.
- Enforce upload MIME + size validation (ties into IP-P2-3 schemas + existing multer caps) — object storage cost abuse is a real risk without it.
- Rate-limit upload endpoints (IP-P2-7) before enabling public uploads to the bucket.
