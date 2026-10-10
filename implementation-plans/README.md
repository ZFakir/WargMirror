# Implementation Plans — How To Use This Folder

Each file in this folder is a self-contained implementation plan for **one remaining item** in [MISSING_ITEMS.md](../MISSING_ITEMS.md). File names carry the register item ID (e.g. `IP-P1-4-…md` implements register item **P1-4**) so progress can be checked off one-to-one.

## Rules for every plan

1. **One item = one branch = one PR.** Create `feet/IP-<id>-<slug>` from the latest `main`. Never commit directly to `main`.
2. **Order matters.** `IP-00` (the Polish-F merge gate) is a hard prerequisite — several plans reference Polish-F symbols that do not exist on `main` yet (`forgotPassword`, `/health`, CI `test:mocked`, `requireAuth` on the flag route).
3. **Check off in the register.** When a plan's acceptance criteria are met and its PR is merged, tick the item in `MISSING_ITEMS.md` in the same PR (or immediately after).

## Database safety (applies to every plan, no exceptions)

- Integration tests and any script that writes data must run **only** against the test database selected by `server/.env.test` (`…warg_test…`). Never point `DATABASE_URL` at the production Aiven URL to "just try something".
- Never run `node seed.js`, `make_admin.js`, `alter_enum.js`, or any migration/one-off script against a production database.
- Schema changes are **additive migrations only** (see `IP-P2-8`). Never `DROP`, never `sync({ force: true })`, never recreate tables on a non-empty database. Take a backup/snapshot of any real database before migrating it.
- `GET` probes against the live API are safe; `POST`/`PUT`/`DELETE` probes against live deployments are not allowed without explicit team approval.

## Before merging any plan's PR

Run the subset of the `MISSING_ITEMS.md` §7 verification matrix that the plan lists under "Verification", plus `npm run lint` in every touched workspace. If a plan touches shared files (`server/src/app.js`, route files, `client/scripts/api.js`), re-run the full server suites — not just the new tests.
