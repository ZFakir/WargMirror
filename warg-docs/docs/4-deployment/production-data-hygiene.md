---
title: Production Data Hygiene
---

# Production Data Hygiene

This runbook is for a planned, team-approved production content curation. It does not authorize ad-hoc database changes. Keep production credentials, account identifiers, backup locations, and the approved keep/delete manifest outside this repository.

## Preconditions

- Assign one operator and pause competing production content writes.
- Agree on the accounts and ARGs to retain before any write.
- Prepare a timestamped full backup location with enough capacity.
- Confirm the restore owner and a disposable test database for the restore drill.

Stop immediately if any precondition is not met.

## Safe sequence

1. Inventory the catalogue, users, flags, and sessions with read-only application/API queries. Record each item as retain, revise, or remove in the private approval manifest.
2. Take a complete, timestamped database backup before any write. Verify it is non-empty and has a valid database-dump header.
3. Have a second team member review the manifest, backup identifier, and each scoped deletion statement before executing it.
4. Prefer reviewed application or admin workflows. If a database statement is unavoidable, use a transaction and delete dependent rows before their parent row. Every deletion must include a narrow `WHERE` condition.
5. Create or revise only the approved curated ARG content through the application workflow.
6. Smoke-test anonymous catalogue and ARG-detail pages, cover images, retained demo/admin access, and one approved gameplay path.
7. Restore the backup into the disposable test database and compare expected row counts before closing the change window.

## Non-negotiable guardrails

- Never run `TRUNCATE`.
- Never issue `DELETE` without a reviewed `WHERE` clause.
- Never reset or reseed production as part of curation.
- Never commit production exports, personal data, credentials, or the private approval manifest.
- Do not proceed after a missing, empty, or unverified backup.
- Log the operator, time window, backup identifier, approved manifest version, and verification outcome in the team’s private operational record.

## Rollback

If verification fails, stop further writes. Restore the validated pre-change backup to the affected environment using the team-approved procedure, then repeat read-only smoke checks before reopening access.
