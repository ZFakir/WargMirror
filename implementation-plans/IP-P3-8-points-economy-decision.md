# IP-P3-8 — Decide and Resolve the Points-Economy Claim

**Register item:** MISSING_ITEMS.md §5, P3-8 (replay copy mentions points; no points exist)
**Prerequisites:** IP-00. Decision item — the *decision* is the deliverable; implementation is conditional.
**Effort:** 30 minutes to defer honestly; 1–2 days to implement.

## 1. What is missing and why it matters for scoring

Game replay copy refers to resetting "points," but the system awards no points anywhere. This is a visible feature inconsistency: a marker replaying a game will read a claim the product cannot fulfil. Rubric-wise it is less about the feature and more about **submission honesty** — every claim must match shipped behaviour (the same principle behind P3-9 and P3-13).

## 2. Current state (verified)

- Replay/reset copy lives in the game flow (`client/scripts/game.js` replay/reset area — exact strings to be grepped for `point` during subtask 1; candidates near the L708-761 cluster where flow-end messaging lives).
- No `points` column exists on the User model; no points logic in `server/src/` (verified: `play_count`/`completion_count` at `Arg.js:17-18` are the only analytics columns, and they have no writers — see IP-P2-10).
- Decision belongs to the team; this plan covers both branches with a recommendation.

**Recommendation: defer (fix the copy).** Rationale: the honest-words fix is 30 minutes and removes the inconsistency; a points economy touches DB schema (new table via IP-P2-8), transaction logic (IP-P2-10 territory), profile UI, and abuse/farming tests — 1–2 days the deadline likely cannot absorb for a feature no rubric line requires.

## 3. Implementation subtasks

### Branch A — Defer honestly (recommended)

1. Grep client + docs for every user-facing "point" mention: `Select-String -Path client -Pattern 'points?' -Recurse` and the same over `warg-docs/docs` + README.
2. Rewrite copy to speak only about session progress/completion (e.g. "Your progress will be reset" instead of "Your points will be reset").
3. Sweep docs for points claims; update or remove.
4. PR notes record the deferral decision and rationale (links to this plan).

### Branch B — Implement a minimal economy (only if the team decides to)

1. **Schema (via IP-P2-8 framework)**: `points_ledger` table — `id`, `user_id`, `delta` (int), `reason` (varchar), `reference_id` (varchar/nullable), `created_at`. A ledger, not a mutable total: totals are `SUM(delta)` (or a cached column reconciled from the ledger).
2. **Award points server-side, transactionally**: in the minigame/ARG completion path (same transaction as the completion write, IP-P2-10 pattern), `INSERT INTO points_ledger ...` with an idempotency guard (unique key on `(user_id, reason, reference_id)`) so retries/replays cannot farm.
3. **Expose totals**: profile/session summary endpoint returns `points_total`; client profile page renders it (replace the copy rather than adding new surfaces first).
4. **Tests**: replay/retry does not double-award (idempotency test); concurrent completions award exactly once; total equals ledger sum.
5. **Copy + docs**: update replay copy to describe the real economy.

## 4. Required tests/checks

- Branch A: grep shows zero inaccurate points claims in client/docs; full client suite green; visual check of the edited flows.
- Branch B: idempotency + concurrency tests (above); full server + client suites green; manual replay flow verified.

## 5. Acceptance criteria

- User-facing wording exactly matches shipped behaviour — whichever branch was chosen.
- Decision + rationale recorded in the PR (and in known-limitations docs if Branch A, per P3-13).

## 6. Verification without breaking existing functionality

- Branch A: pure copy change — regression risk is nil; run the game-flow tests.
- Branch B: additive table (nullable/no impact on existing rows); awards only fire on completion events that already exist; rollback = revert code + leave table unused (do NOT drop the table in a later PR without backup — see IP-P2-8 safety notes).

## 7. Safety notes

- If Branch B is chosen, it consumes IP-P2-8 migration + IP-P2-10 transaction patterns — do not hand-roll DDL or award outside transactions.
- Never award points based on client-reported events without a server-side completion precondition (that would be farmable).
- Branch A must not leave stale claims in `warg-docs` — docs are part of the submission surface.
