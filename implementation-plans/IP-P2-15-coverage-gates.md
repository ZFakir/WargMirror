# IP-P2-15 — Test Coverage Gates + Real Client Tests

**Register item:** MISSING_ITEMS.md §3, P2-15 (enforce coverage thresholds; replace placeholder client tests; wire all suites into CI)
**Prerequisites:** IP-00 (restores `test:mocked` + lint in CI). Coordinate with IP-P2-16 (coverage gates run in CI; pre-commit runs lint locally).
**Effort:** 3–4 hours of wiring + ongoing test-writing time.

## 1. What is missing and why it matters for scoring

Measured reality: server combined coverage is decent (≈90% statements / 78% branches across unit+mocked+integration), but **CI only runs the mocked suite** — 43 suites (unit + integration) never run in the pipeline, so nothing enforces the numbers. The client has 58 Playwright tests of which **28 are trivial placeholders** ("page loads"), giving 26% statement coverage with no threshold. The `testing.md` claims substantially more than the pipeline proves. The rubric scores "testing strategy with CI enforcement" — gates in CI plus de-placeholdered tests convert existing work into marks.

## 2. Current state (verified)

- `.gitea/workflows/ci.yml` — runs lint + `test:mocked` only; unit and integration Jest projects excluded from CI.
- `server/jest.config.js` — three projects (unit / mocked / integration); coverage thresholds **not configured** (no `coverageThreshold`).
- Measured: combined local run = 316/318 tests, 90.65% stmts / 77.97% branches; 2 stale failures in minigameController/userController exist locally (fix or quarantine as part of this item).
- `client/playwright.config.ts` — monocart v8 coverage always enabled; 26.2% stmts / 15.1% branches measured; no gate.
- 28 of 58 client tests are placeholders (`tests/` — e.g. load-page assertions × 2 browsers).

## 3. Implementation subtasks

1. **Fix/quarantine the 2 stale server failures first** — a red suite makes gates meaningless. Diagnose `minigameController`/`userController` failing tests; fix properly or, if truly obsolete, delete with justification in the PR (never `test.skip` silently).
2. **Server coverage thresholds** in `server/jest.config.js`: add `coverageThreshold` per project anchored at **current measured reality minus a small buffer** (e.g. global statements ≥ 85%, branches ≥ 70%, with per-project floors) — ratchet upward over time; a gate at 100% today just gets disabled.
3. **Run all three projects in CI**: extend `.gitea/workflows/ci.yml` to run unit + mocked + integration (integration needs the MySQL `warg_test` service, which CI already provides; ensure `DB_*` env for the service is wired). Collect merged coverage (`--coverage` with a combined report) and fail the build under threshold.
4. **Client coverage gate**: keep monocart but add a threshold check step in CI (monocart CLI can enforce thresholds, or parse the summary JSON and `exit 1` below floor). Set the floor at current reality (≈25% stmts) with a ratchet policy, and make the coverage reporter opt-in locally (`COVERAGE=1 npm test`) so default local runs are fast and stable — the always-on v8 reporter is also a source of the Firefox context-close flakiness (58/58 pass with plain reporter).
5. **De-placeholder 28 client tests**: upgrade each placeholder to assert real behavior — e.g. login flow error/success states, catalogue renders cards from mocked API data, vote button optimistic update, modal open/close, admin gating. Prioritize flows that map to rubric features. Mock API responses at the `api.js` layer (stub `fetch`) or use Playwright route interception.
6. **Docs honesty**: update `testing.md`/docs so claims match the wired-up reality (suites run, thresholds, known exclusions).

## 4. Required tests/checks

- CI green end-to-end on the branch (all three server projects + client suite + thresholds).
- Deliberate coverage-drop experiment: locally lower a threshold → build fails; restore → passes (proves the gate bites).
- Client: count of placeholder assertions reduced to 0; coverage summary shows the rise.

## 5. Acceptance criteria

- CI runs unit + mocked + integration with enforced thresholds; failing thresholds fail the build.
- Zero placeholder client tests remain (each asserts behavior).
- `testing.md` claims == pipeline reality.

## 6. Verification without breaking existing functionality

- No production code changes expected (tests/config/CI only) — if a test change requires a source tweak, keep it minimal and reviewed.
- Integration tests only ever hit `warg_test` (`.env.test` is already scoped; CI uses its own service).
- Run the full matrix locally before pushing: server unit/mocked/integration + client Playwright.

## 7. Safety notes

- Coverage thresholds must be set from **measured** numbers, not aspirations — an unmeetable gate will be bypassed under deadline pressure, which is worse than no gate.
- Never weaken/delete a failing test to raise coverage without recording the reason in the PR.
- The CI MySQL service must be isolated per-run; never point CI at the shared Aiven `warg_test` concurrently with local runs.
