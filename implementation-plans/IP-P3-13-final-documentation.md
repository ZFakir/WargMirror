# IP-P3-13 — Final Documentation Completeness

**Register item:** MISSING_ITEMS.md §5, P3-13 (known-limitations page; API reference refresh; final evidence; screenshots)
**Prerequisites:** All elected items merged — this is the **last** item before IP-P1-8 (release tag). Running it early produces stale docs; running it never produces an inconsistent submission.
**Effort:** 3–5 hours after implementation stabilizes.

## 1. What is missing and why it matters for scoring

Documentation is where markers spend most of their marking time. The gaps: no known-limitations page (cold starts, console fallback, Socket.io scope, deferred features), the API reference lagging behind Polish-F routes (`/health`, `/auth/forgot`, `/auth/reset`, POST logout) and the P1-4 cover endpoints, and no final consolidated evidence (test results, Lighthouse, screenshots). The rubric's documentation criterion rewards completeness **with evidence** — every claim must trace to a recorded result (MISSING_ITEMS.md §7's verification matrix is the checklist).

## 2. Current state (verified)

- `warg-docs/docs/` has section dirs: `1-overview`, `2-architecture-and-design`, `3-database`, `4-deployment`, `5-policies`, `6-api-reference`, `7-frontend` (+ `10-ai-usage` from Polish-F). Known-limitations location TBD — likely under `1-overview` or `5-policies`; check `sidebars.js` structure.
- Polish-F added routes not yet in the API reference: `GET /health`, `POST /api/auth/forgot`, `POST /api/auth/reset`, `POST /api/auth/logout` (verify exact paths in `server/src/routes/` post-merge).
- P1-4 adds the cover-delivery contract (`has_cover`, cover-image URL endpoints) — must be documented here once merged.
- Evidence sources ready: §7 verification matrix commands, `smoke-test/` screenshots, Lighthouse exports, coverage reports.
- IP-P1-3 gives the docs site a real URL — cross-link everything once live.

## 3. Implementation subtasks

1. **Known-limitations page** (new, e.g. `warg-docs/docs/1-overview/known-limitations.md` + sidebar entry): candid entries — Render cold starts (and the chosen mitigation from IP-P2-1), console/log fallback if no centralized logging shipped, Socket.io scope per the IP-P3-9 decision, deferred points economy (IP-P3-8) and notifications/recommendations (IP-P3-10/11) deferrals, test-coverage ratchet policy (IP-P2-15). Tone: honest, dated, signed-off.
2. **API reference refresh** (`6-api-reference`): add Polish-F auth routes (forgot/reset/logout), `/health`, and the P1-4 media contract (request/response shapes incl. `has_cover`, cover URL construction, cache headers). Verify each documented route against the actual route files (`server/src/routes/`) — the reference must match code, not memory.
3. **Final evidence pass**: run the §7 verification matrix in full after the last merge; record results (pass/fail + numbers) with commit SHA + date in `warg-docs/docs/7-frontend/testing.md` (or the testing page's actual location) and/or the release notes. Attach: coverage summaries (server/client), Lighthouse before/after tables (perf/a11y), payload-size numbers (P1-4 acceptance).
4. **Screenshots**: capture current desktop + mobile screenshots of home, catalogue, game flow, studio, docs site; commit under `warg-docs/static/img/` (or the existing screenshots location — check what the docs already reference); ensure the site build still passes with new assets.
5. **User-feedback follow-up**: if the brief expects it, add a short "user feedback + responses" section (what testers said, what changed) — only with real feedback recorded.
6. **Cross-link sweep**: README ↔ docs site (live URL from IP-P1-3) ↔ AI attribution page (P1-2b); a marker should reach architecture, API, testing, deployment, limitations, and attribution within two clicks from the README.

## 4. Required tests/checks

- `cd warg-docs; npm run build` — exit 0 (every docs change; broken links/config fail here).
- Route-vs-docs diff: for each documented endpoint, grep `server/src/routes/` to confirm it exists with the documented method/path (script it or check manually with a table in the PR).
- Placeholder sweep on the docs (same grep pattern family as IP-P1-2b subtask 5) — no TODO/TBD left in submission-facing pages.
- Full §7 matrix executed and recorded.

## 5. Acceptance criteria

- Known-limitations page exists, sidebar-visible, dated.
- API reference covers every shipped route incl. auth-reset + health + media contract.
- Evidence recorded with commit SHA/date; screenshots current; no docs claim lacks evidence.
- A fresh reader can find all six areas (architecture, API, testing, deployment, limitations, attribution) from the README.

## 6. Verification without breaking existing functionality

- Docs-only change (plus static images); `docusaurus build` is the gate; no runtime/database impact.
- Re-deploy the docs site (Wrangler, per IP-P1-3) after merging and verify the new pages are publicly reachable.
- Rollback: content revert restores previous docs; nothing else affected.

## 7. Safety notes

- **Do not publish numbers before the final clean run** — the register warns against publishing claimed results before final tests; the evidence pass must happen after the last code merge, immediately before IP-P1-8 tagging.
- Screenshots must not contain real user data from production (use the curated demo dataset from IP-P2-12 or blurred/synthetic data).
- Keep the AI-attribution page consistent with any workflow changes made during implementation (re-check tool/area claims against what actually shipped).
