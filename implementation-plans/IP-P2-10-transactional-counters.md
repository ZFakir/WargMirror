# IP-P2-10 — Transactional Writes (Vote Recount + Counters)

**Register item:** MISSING_ITEMS.md §3, P2-10 (atomic/transactional multi-write operations)
**Prerequisites:** IP-00. Independent; touches the same files as IP-P2-6 (voteArg) — coordinate to avoid merge conflicts.
**Effort:** 4–6 hours.

## 1. What is missing and why it matters for scoring

Multi-step writes run without transactions, and some derived counters are never written at all. Consequences a marker can demonstrate:

- **voteArg** (`argController.js:343-383`): vote row write and the `like_count`/`dislike_count` recount are separate, non-atomic statements (L373-376). Two concurrent votes can interleave and the stored counts diverge from the actual vote rows (lost update / race condition).
- **play_count / completion_count** (`server/src/models/Arg.js:17-18`): zero writers found anywhere in `server/src` — the analytics columns are dead schema. Every play/completion event is discarded.

"Concurrency handled correctly / transactions used for multi-step writes" is an explicit rubric criterion; this item is the direct fix.

## 2. Current state (verified)

- `argController.js:343-383` — voteArg: insert/update vote row, then recount via separate aggregate query, then `save()`. No `sequelize.transaction`.
- No `transaction` keyword anywhere in `server/src/controllers/` (grep verified).
- `Arg.js:17-18` — `play_count`, `completion_count` columns exist; no `increment`/`update` calls reference them.
- Session/minigame completion flow: `sessionController.js` + `minigameController.js` finish paths do not touch the counters.
- Client displays counts on `GameCard.js` (likes/dislikes from voteArg response; no play/completion UI consumption found).

## 3. Implementation subtasks

1. **`voteArg` transaction** (argController.js:343-383): wrap vote upsert + recount + `arg.save()` in `await sequelize.transaction(async (t) => { ... })`, passing `transaction: t` to every query in the block. Re-read counts **inside** the transaction (they are) and keep the response shape (`{ success, like_count, dislike_count }`) identical — `GameCard.js` consumes it.
2. **Audit other multi-write paths** and wrap them the same way: minigame attempt creation + session progress update (`minigameController.js` L11-88 area + `sessionController.js` L7-40 area), friend request accept (write + reciprocal write in `userController.js`), ARG publish/remove where a row plus dependent rows change together. List each wrapped path in the PR description.
3. **Implement the dead counters**:
   - `increment('play_count')` when a playable session/game page load is recorded server-side — find the existing endpoint that logs a play/session start (session creation in `sessionController.js`) and increment there, in the same transaction.
   - `increment('completion_count')` when the completion condition fires (minigame evaluate / session close path), same-transaction.
   - Reject any plan to do this client-side; counters must be server-authoritative.
4. **Keep recount as source of truth for votes**: the transactional recount already fixes drift; optionally add a cheap consistency assertion in an integration test.

## 4. Required tests/checks

- New integration test on `warg_test`: fire N concurrent vote requests (Promise.all) for the same ARG with mixed like/dislike; assert final `like_count`/`dislike_count` equal the vote-row aggregates exactly.
- Counter tests: session start increments `play_count` exactly once per session; completion path increments `completion_count` once; double-submit does not double-count (idempotency via existing attempt checks — verify, don't assume).
- Existing suites green; `npm run lint`.

## 5. Acceptance criteria

- All identified multi-write endpoints execute inside Sequelize transactions.
- Concurrent-vote test passes with exact-count assertion.
- `play_count`/`completion_count` have real server-side writers and are covered by tests.

## 6. Verification without breaking existing functionality

- Response shapes unchanged (vote response consumed by `GameCard.js` optimistic update + server reconcile path).
- Run the vote flow manually (dev): like → unlike → like; counts track correctly in UI and DB.
- Rollback: revert is code-only; counter columns remain (they are nullable/default 0 — additive, no data impact).

## 7. Safety notes

- Transaction code must pass the `transaction` handle to **every** query in the block — a missed query silently escapes the transaction and the race remains.
- Keep transactions short: no network calls (e.g. media uploads) inside them.
- Counter increments are additive-only on existing rows; no migrations needed beyond what already exists (columns are present).
