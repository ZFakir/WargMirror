# IP-P2-6 — Query Performance (N+1 Elimination + Indexes)

**Register item:** MISSING_ITEMS.md §3, P2-6 (database/query optimization)
**Prerequisites:** IP-00. Complements IP-P1-4 (payload) and IP-P2-5 (pagination); do after both so measurements reflect the fixes.
**Effort:** 3–4 hours.

## 1. What is missing and why it matters for scoring

The hottest query paths run per-row queries inside loops (classic N+1) and there are no database indexes beyond primary/unique keys. `evaluateConditions` in the minigame engine does one `MinigameAttempt.findOne` **per condition per evaluated edge**, and other endpoints (`argController.js`, session endpoints) re-query associations per row. Combined with the BLOB leak, this is why measured LCP was ~14 s on mobile. "Query performance optimized / N+1 addressed" is an explicit rubric line a marker can verify by reading the code.

## 2. Current state (verified)

- `server/src/` minigame evaluation (`evaluateConditions`, L6-39): `MinigameAttempt.findOne` at L31 inside the per-condition loop; called per-edge from L346; additional `findAll` at L108, L560, L614.
- `server/src/controllers/argController.js` getAllArgs — associations fetched per ARG row pattern; voteArg recount (L373-376) runs additional unindexed lookups + a non-transactional write (transaction part belongs to IP-P2-10).
- `database/schema.sql` — no secondary indexes on foreign keys (`arg_id`, `user_id`, `session_id`, `reporter_id`) or on `MinigameAttempt` lookup columns.
- `database/migrations/` is **empty** — index additions will be the first migration; coordinate with IP-P2-8 which establishes the migration framework.
- Live measurement: `GET /api/args` = 5.6 MB / multi-second (pre-IP-P1-4 baseline).

## 3. Implementation subtasks

1. **Fix `evaluateConditions` N+1**: before the loop, fetch all needed attempts in one query keyed by the IDs being evaluated (e.g. one `findAll({ where: { ... } })` + an in-memory Map lookup per condition). Same treatment for the L560/L614 `findAll` call sites if they sit in loops.
2. **`getAllArgs` eager loading**: fetch associations with `include` and required `attributes` in one query per association (Sequelize does this as a single JOIN or batched query), instead of per-row fetches.
3. **Add indexes** (via the IP-P2-8 migration framework; if IP-P2-8 is not done yet, ship `ALTER TABLE ... ADD INDEX` statements as a forward-only migration file in this branch and let IP-P2-8 generalize the runner):
   - `minigame_attempts(arg_id)`, `minigame_attempts(user_id)`, `minigame_attempts(session_id)` (exact table/column names per `database/schema.sql`).
   - `sessions(user_id)`, `flags(arg_id)`, `flags(reporter_id)`, votes table `(arg_id, user_id)` unique if not already present.
   - All `ADD INDEX`, nothing destructive.
4. **Verify with EXPLAIN**: run the evaluated queries against `warg_test` with `EXPLAIN` before/after; record rows-examined improvement in the PR description.
5. **Timing harness**: add/extend a Jest integration test asserting the ARG list endpoint completes under a generous ceiling (e.g. < 1.5 s for the seeded test set) to prevent regression.

## 4. Required tests/checks

- Existing suites green (unit/mocked/integration).
- New integration assertion: number of SQL statements issued by `GET /api/args` does not grow with ARG count (spy on Sequelize query execution or assert the single eager-load query pattern).
- Manual: `EXPLAIN` output before/after on `warg_test`; live GET probe latency drop after deploy.

## 5. Acceptance criteria

- No `findOne`/`find` inside per-row loops on the evaluated hot paths (code review confirms).
- Indexes exist for every FK used in WHERE/JOIN clauses on hot tables.
- Measured endpoint latency improves (documented numbers in PR).

## 6. Verification without breaking existing functionality

- Logic-equivalence tests: same inputs produce same evaluation results before/after the batching change (existing minigame unit tests largely cover this — they must pass unchanged).
- Index creation is online on MySQL/InnoDB for `ADD INDEX` but run it against `warg_test` first regardless.
- Rollback: dropping indexes / reverting the batching commit restores prior behavior with no data change.

## 7. Safety notes

- **Never** use `sync({ force: true })` or `alter: true` against any live database; forward-only `ADD INDEX` migrations only.
- Back up production (mysqldump) before applying the index migration there; test the exact migration SQL on `warg_test` first.
- Batching changes which rows are locked in a transaction window — keep transactions (IP-P2-10) in mind when combining.
