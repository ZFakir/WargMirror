# IP-P2-16 — Pre-Commit Hooks Decision + Implementation

**Register item:** MISSING_ITEMS.md §3, P2-16 (decide and enforce local quality gates before commit)
**Prerequisites:** IP-00 (lint must pass on main first — currently blocked until merge; the hook must not be installed on a red baseline). Pairs with IP-P2-15 (CI gates are the backstop).
**Effort:** 1–2 hours.

## 1. What is missing and why it matters for scoring

Nothing runs before a commit: no lint, no format check, no quick test pass. Quality enforcement lives entirely in CI, which means broken lint or failing unit tests are discovered after push — slow, and on a shared Gitea runner it wastes pipeline time. The rubric rewards a documented, enforced workflow ("code quality processes"). A decision either way — install hooks **or** explicitly document "hooks deliberately not used; CI is the gate" — counts; silence does not. This item records and implements the decision.

## 2. Current state (verified)

- No `.husky/` directory, no `pre-commit`/`lint-staged` in root `package.json` devDependencies; no `.pre-commit-config.yaml`.
- Root `package.json` exists with workspace-ish scripts (per-workspace npm management knowledge card — each workspace has its own lockfile).
- Client has `eslint.config.mjs`; server has `eslint.config.mjs` (post-IP-00 the server lint is clean).
- Client has Prettier-adjacent formatting conventions; no explicit prettier config file found at root (verify before adding format hooks — if the codebase isn't prettier-normalized, a format hook creates massive diff noise).

## 3. Implementation subtasks

1. **Make the call (team decision, recorded in this plan + PR description)**: recommended **YES, install minimal hooks** — the team is small and CI feedback is already slow on Render/Gitea tiers.
2. **Install** at repo root: `husky` + `lint-staged` as devDependencies (root `package.json`; commit the lockfile).
3. **Hook contents (keep fast — under ~60 s or developers will bypass)**:
   - `pre-commit`: `npx lint-staged` only.
   - `lint-staged` config (root `package.json` or `.lintstagedrc.json`):
     - `server/**/*.js` → `eslint --fix` (run server ESLint via `npm --prefix server run lint -- --fix` or direct eslint with the server config).
     - `client/**/*.{js,html,css}` → client eslint fix.
     - `*.md` / docs → no checks (keep hook fast; prose lint is noise).
   - **Do not** run tests in the hook; tests belong in CI (IP-P2-15) and manual runs. Optionally add a `commit-msg` hook enforcing conventional prefixes (`feat:`, `fix:`, `docs:`) — only if the team wants it; skip if it adds friction.
4. **Formatting decision**: if no Prettier config exists, do NOT add prettier to the hook in this item (normalizing the whole repo's formatting is a separate, noisy PR). Rely on ESLint `--fix` only. Record "Prettier adoption: deferred" in the PR.
5. **Install hooks for the team**: document `npm install` (husky's `prepare` script auto-installs hooks) in README "Getting started"; hooks live in `.husky/` and are committed.
6. **CI parity check**: confirm the hook runs the same ESLint configs CI runs — no stricter/weaker local rules.

## 4. Required tests/checks

- Deliberate test: introduce a lint error in a staged server file → commit blocked with the ESLint output; fix → commit passes.
- A docs-only commit passes instantly (proves the hook is scoped).
- `git commit` of a markdown plan file unaffected.
- Full CI run green afterward (hook changes nothing CI sees, but verify).

## 5. Acceptance criteria

- `pre-commit` hook active on every dev machine after `npm install`, running ESLint --fix on staged JS only.
- Decision + rationale recorded (this file + README note); Prettier deferral documented.
- Hook runtime < ~60 s typical.

## 6. Verification without breaking existing functionality

- Hooks are local tooling: reverting the commit removes them; no runtime behavior changes.
- Ensure `.husky/` scripts are POSIX-sh compatible (Gitea runners/dev machines include Git Bash on Windows).
- Verify the hook does not run `npm install`/network operations (offline commits must work).

## 7. Safety notes

- Never put migration runners, seeds, or any DB-touching command in a git hook.
- Hooks must not modify staged files silently beyond `--fix` output that ESLint reports; if `--fix` changes a file, the commit aborts and the dev re-stages — that is lint-staged's default behavior; keep it.
- Document `git commit --no-verify` as the documented escape hatch for emergencies (with the understanding CI will catch issues).
