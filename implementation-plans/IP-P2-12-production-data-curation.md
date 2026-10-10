# IP-P2-12 — Production Data Curation

**Register item:** MISSING_ITEMS.md §3, P2-12 (curate production content; remove test junk)
**Prerequisites:** IP-00. Data-only task; pair with IP-P2-15 (curated content deserves working tests).
**Effort:** 1–3 hours.

## 1. What is missing and why it matters for scoring

Markers evaluate the **live deployment**, and the live database currently holds a mix of demo ARGs and leftover test junk (dev accounts, throwaway ARGs from manual testing, flag/report spam from probes). A submission where the live catalogue looks like a test dump reads as "not production-ready" no matter how good the code is — the rubric's "deployment demonstrates the system with realistic data" criterion fails on appearance alone. Curated content also makes every other fix legible: pagination, search, and performance numbers all improve in meaning when the dataset is real.

## 2. Current state (verified)

- Live `GET /api/args` returns 6 ARGs (measured during assessment); titles/descriptions are demo-grade.
- Live auth works against the production DB; test/dev accounts exist from development (`make_admin.js` usage history).
- No staging environment exists — curation must happen directly on production, which makes backups non-negotiable.
- Flag/report rows exist from security probing and manual tests.
- This item cannot usefully be "coded" — it is an operational task; the deliverable is a clean live dataset **plus a repeatable data-hygiene runbook** in the docs.

## 3. Implementation subtasks

1. **Inventory first (read-only)**: dump current production catalogue via the API (GET-only probes): ARGs, users, flags, sessions. Classify each row: keep / curate (rewrite) / delete.
2. **Backup**: take a full `mysqldump` of production **before any write**; store it somewhere the team can restore from; record the filename + timestamp in the runbook.
3. **Content plan**: decide the target catalogue (e.g. 8–12 ARGs) with realistic titles, captions, covers (uploaded through the fixed upload path from IP-P1-4/P2-9), and varied modes (solo/coop/pvp/live). Write the copy in a scratch file first — not directly into the DB.
4. **Execute curation** (all writes through the application's own API or admin UI where possible — never raw SQL against production unless unavoidable; if raw SQL is needed, wrap in a transaction and keep statements logged):
   - Delete test/dev ARGs and their dependent rows (flags, votes, attempts) — respect FK order or use the app's delete endpoints.
   - Deactivate/delete dev accounts except the agreed demo/admin accounts; keep credentials documented only in the team's private notes, **never in the repo**.
   - Clear flag/report spam rows via the admin endpoints or a reviewed DELETE with WHERE clauses.
   - Create/rewrite the curated ARGs with proper covers and descriptions.
5. **Verify the live site**: home + catalogue render cleanly; each ARG opens; images load; counts sensible.
6. **Runbook**: add `warg-docs/docs/4-deployment/` (or README section) "Production data hygiene" — backup command, inventory query, deletion order (children before parents), restore instructions.

## 4. Required tests/checks

- No automated tests (data task) — but the runbook's inventory commands should be re-runnable and produce the same classification.
- Post-curation smoke: run the existing Playwright smoke suite against production read-only paths, or at minimum GET probes of every page + one full ARG play-through with a demo account.

## 5. Acceptance criteria

- Live catalogue contains only curated, realistic ARGs with working covers; no test junk visible to an anonymous marker.
- No unexplained flags/spam rows remaining.
- A backup exists from before curation and the runbook is in the docs.

## 6. Verification without breaking existing functionality

- After curation, existing accounts the team relies on (admin, demo user) still authenticate.
- Client pages load against the new dataset (GET probes + browser pass).
- The backup restore procedure was **written and reviewed** (dry-run restore to `warg_test` if time permits — restore the dump into the test DB and verify row counts).

## 7. Safety notes (critical)

- **One writer at a time.** Freeze other production writes during curation; coordinate with the team.
- Backup before ANY write; verify the backup file is non-empty and starts with a valid dump header before proceeding.
- Never commit scraped/copied personal data or credentials into the repo while curating.
- All deletions go through reviewed, logged statements — no `DELETE` without `WHERE`, no `TRUNCATE`, ever.
