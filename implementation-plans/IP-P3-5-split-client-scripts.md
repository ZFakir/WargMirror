# IP-P3-5 — Split Large Client Scripts + Extract Inline Presentation

**Register item:** MISSING_ITEMS.md §5, P3-5 (`game.js` ~1000 lines, `MapModal.js` ~1300 lines)
**Prerequisites:** IP-00. **Do not start while gameplay rules are still changing** (register's own warning) — schedule after gameplay is frozen (post-P2 items). Do not combine with IP-P3-3 (same files).
**Effort:** 1–2 days.

## 1. What is missing and why it matters for scoring

`client/scripts/game.js` (~1000 lines) mixes bootstrap, waypoint/geofence logic, minigame orchestration, comments, and state/offline coordination in one IIFE; `client/scripts/components/MapModal.js` (~1300 lines) does map + modal + inline template styles. This is a maintainability criterion marker: "code organization / separation of concerns". It also has practical scoring value: focused modules are what make the P2-15 de-placeholdered tests writable.

## 2. Current state (verified)

- `client/scripts/game.js` — single file, ~1000 lines, verified alert cluster at L135-983 (spread across the whole file = responsibility spread).
- `client/scripts/components/MapModal.js` — ~1300 lines; inline `style=` template strings inside generated markup.
- `client/styles/` — 12 stylesheet files exist; game/map styles partially extracted already.
- Tests touching these: `client/tests/` game/offline/comment specs (among the 16 test files); all 58 tests must stay green.
- Script loading is plain `<script>` tags per HTML page (no bundler) — module boundaries must respect global/`window.*` API stability.

## 3. Implementation subtasks

1. **Map current responsibilities** in `game.js` by line range (read first; no edits): bootstrap/init, waypoint/geofence flow, minigame orchestration, comments, state/offline coordination. Document the map in the PR.
2. **Split into modules** under `client/scripts/game/`:
   - `game/bootstrap.js` (init + wiring), `game/geofence.js`, `game/minigames.js`, `game/comments.js`, `game/state.js` (offline/session state) — exact boundaries per the map from subtask 1.
   - Keep one thin `game.js` that loads/initializes in the same order as today's script execution, exposing the same `window.*` API surface other pages/scripts use (grep for cross-references to `game.js` globals first).
   - Loading strategy: ES modules via `import` where already used (`GameCard.js` uses dynamic `import()`) — but respect that plain pages rely on script order; safest is small ES modules imported by a thin `game.js`, verified page-by-page.
3. **Extract inline styles**: move `style="..."` template strings in MapModal/game markup into `client/styles/` classes (e.g. `.map-modal__spinner`); keep behavior identical.
4. **Game split first, MapModal only after the game split is stable and merged** (register subtask 4) — one big refactor per PR.
5. **After each module move**: run the targeted Playwright tests (game flow, offline, comments) + full suite `--reporter=json`.

## 4. Required tests/checks

- Full Playwright suite green after each commit (58 tests).
- No behavioral change: gameplay walkthrough (open ARG → waypoint → minigame → completion) manually verified on the dev build.
- Grep guard: no new `style="` attributes introduced in files touched (net reduction).
- `cd client; npm run lint`.

## 5. Acceptance criteria

- `game.js` responsibilities live in focused modules behind a stable public API; no script exceeds a sane size (target < ~400 lines/module).
- No behavioral regression; all tests green at each step.
- MapModal split shipped as a separate, later PR.

## 6. Verification without breaking existing functionality

- This is a pure move/refactor: each commit should change structure, not logic. Review diffs with `--color-moved` where possible.
- Keep the original file's external event listeners (DOMContentLoaded etc.) firing in the same order.
- Any logic fix discovered during the split goes in its own commit/PR — never fold fixes into the move.

## 7. Safety notes

- Pure client refactor; no server/database impact.
- The register warns against combining this with gameplay-rule changes — treat that as a hard rule; merge-order conflicts with IP-P3-3 are why P3-3 goes first (it is smaller).
- If the split reveals dead code, delete it in a separate commit with the finding noted in the PR (feeds IP-P3-6).
