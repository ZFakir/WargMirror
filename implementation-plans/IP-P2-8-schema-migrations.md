# IP-P2-8 — Database Migration Framework

**Register item:** MISSING_ITEMS.md §3, P2-8 (proper migration tool + versioned migrations)
**Prerequisites:** IP-00. Do this **before** IP-P2-6 (indexes) and IP-P2-9 (media storage) — both deliver their DDL through this framework.
**Effort:** 1–2 days.

## 1. What is missing and why it matters for scoring

There is no migration system. Schema changes are applied by hand or via one-off root-level scripts (`server/alter_enum.js`, `server/migrate_minigames_enum.js`, `migrate_minigames_enum_pd.js`, `migrate_minigames_enum_plaque.js`), while `database/migrations/` sits empty and `database/schema.sql` is edited directly. This fails the rubric's "database versioning / migration strategy" criterion outright, and it is operationally dangerous: nothing guarantees production, test, and CI schemas match — the exact scenario that can silently wipe or corrupt data during a deploy. A marker will look for a `migrations/` folder with ordered, reversible migrations and a documented runner command.

## 2. Current state (verified)

- `database/migrations/` — empty directory.
- `database/schema.sql` — full-schema dump; used as reference.
- Ad-hoc migration scripts at `server/` root (see above) — not idempotent, not ordered, not recorded anywhere after running.
- Sequelize is the ORM (`server/package.json`) but **umzug/sequelize-cli is not installed** — no `sequelizerc`, no config file.
- CI (`.gitea/workflows/ci.yml`) provisions MySQL `warg_test` but runs no migrations — the schema must already match by hand.

## 3. Implementation subtasks

1. **Choose the runner**: install `umzug` (pairs naturally with the existing Sequelize connection; no config-file ceremony) OR `sequelize-cli`. Recommended: **umzug** with a thin wrapper so migrations reuse `server/src/models/index.js`'s Sequelize instance.
2. **Create `server/src/migrations/`** (or populate `database/migrations/` — pick one canonical location; `server/src/migrations` keeps it inside the deployed app) with:
   - A timestamped naming convention: `YYYYMMDDHHMM-<name>.js`.
   - Each file exporting `up({ context: queryInterface })` / `down(...)` using `queryInterface.addColumn`, `addIndex`, etc. — raw, forward-safe DDL.
   - A **schema_migrations-style bookkeeping**: umzug's default table (`SequelizeMeta`) records applied migrations.
3. **Write the runner**: `server/scripts/migrate.js` — connects via the existing config (`server/src/config/…` / `.env` handling), runs `umzug.up()`, logs applied migrations, exits non-zero on failure. Add npm scripts in `server/package.json`: `"db:migrate": "node scripts/migrate.js"`, `"db:migrate:undo": "node scripts/migrate.js --undo"`.
4. **Baseline migration**: write `...-baseline.js` capturing the **current** schema diff as of main — or simpler and safer: document that existing databases are grandfathered (baseline = schema.sql applied) and the framework starts recording from now. Prefer the grandfather approach; do NOT attempt to auto-diff.
5. **Convert the pending DDL items into migrations** (the first real users of the framework):
   - Index migration for IP-P2-6 (`ADD INDEX` statements, forward-only).
   - IP-P2-9 media columns (e.g. `cover_image_url`, `avatar_url`) as nullable additive columns.
6. **CI + test wiring**: add a `db:migrate` step to `.gitea/workflows/ci.yml` before tests (the MySQL service starts empty), and document in `README.md`/`warg-docs` deployment guide that production deploys run `npm run db:migrate` before starting the server.
7. **Retire the ad-hoc scripts**: move `alter_enum.js` / `migrate_minigames_enum*.js` into `server/scripts/archive/` with a README note, or delete them on this branch — they must never be run again (enum ALTERs on live data need to go through the new framework).

## 4. Required tests/checks

- Jest integration: run `db:migrate` against a fresh `warg_test` schema → all migrations apply cleanly and are recorded; run again → no-ops (idempotency via bookkeeping).
- Down-migration test for at least the index migration on `warg_test`.
- Full existing suites green post-migration on `warg_test`.
- CI run passes with the new migrate step.

## 5. Acceptance criteria

- Ordered, timestamped migration files in one canonical directory with `up`/`down`.
- Runner command documented and used by CI; production deploy instructions mention it.
- Old ad-hoc migration scripts archived/removed so they cannot be re-run.
- Applying migrations to a fresh schema yields a database the current code works against (integration suite proves it).

## 6. Verification without breaking existing functionality

- **Migrate `warg_test` first, always.** Only after the framework is proven there, apply to production — with a fresh `mysqldump` backup taken immediately before.
- Existing production data untouched by additive/index migrations; verify row counts of key tables before/after.
- Rollback story: every migration has a working `down`; practice on `warg_test`.

## 7. Safety notes (critical)

- **Never** ship a migration containing `DROP`, `TRUNCATE`, `DELETE` without a WHERE, or enum-rewrites that cast existing values — the wipe risk lives here.
- Never run `sync({ force: true })`, `alter: true`, `seed.js`, `make_admin.js`, or the archived enum scripts against production.
- Every new migration must be reviewed with the question "what happens to existing rows?" answered in a comment inside the file.
- Backups before every production migrate; record the backup filename in the PR/deploy notes.
