# IP-P1-8 — Create the Submission Release Tag and Release Evidence

**Register item:** MISSING_ITEMS.md §3, P1-8
**Prerequisites:** IP-00 (Polish-F merge); §7 verification matrix green on the commit to be tagged. Decide explicitly which planned items must land before the tag — the register's deadline list is P1-4, P1-1b, P1-2b, P1-3, P2-7, P2-15, P2-13+P3-2; deferring a P3 item is fine if it is recorded as deferred.
**Coordinates with:** IP-P3-13 (release notes link back to docs/limitations).
**Effort:** 20 minutes.

## 1. What is missing and why it matters for scoring

The project policy promises SemVer, but the repository has no tags or releases (`git tag -l` is empty as of this register). Without a tag, "the submission" is ambiguous — a marker cannot tell which of the many later commits is the assessed revision, and the team cannot prove what was submitted. A release tag with honest notes is cheap, permanent submission evidence.

## 2. Current state (verified)

- No tags exist on the repository; `main` is at `0beaf22` at the time of writing.
- The team hosts on **Gitea** — releases are created in the Gitea UI (or via API), not GitHub Releases.
- Deployment URLs to cite: frontend `https://warg-mirror.vercel.app`, API `https://wargmirror.onrender.com` (confirm both are still the canonical URLs at release time).

## 3. Implementation subtasks

1. **Confirm the submission commit** with the team: it must be the merge commit on `main` after the final planned PRs, with the §7 matrix green. Write the SHA down before tagging.
2. **Create an annotated tag** (annotated, not lightweight, so it carries a message and date):
   `git tag -a v1.0.0 <sha> -m "WARG Platform v1.0.0 — submission release"`
3. **Push the tag:** `git push origin v1.0.0` (push only the tag; never force-push anything).
4. **Verify remote visibility:** `git ls-remote --tags origin` must list `v1.0.0`.
5. **Publish the Gitea release** on that tag with honest notes:
   - what is included (major features: ARG builder, catalogue, geofence play, minigames, friends, admin, analytics, AI vision service);
   - deployment URLs (app + API + docs site from IP-P1-3);
   - how to verify: the exact §7 commands and their recorded results;
   - known limitations (Render cold start, realtime co-op scope, any deferred P3 items);
   - links: docs site, AI-attribution page, repository.
6. **Record the tag in the docs** (one line in README "Releases" section or the deployment guide).

## 4. Required checks

- `git ls-remote --tags origin` shows `v1.0.0`.
- `git checkout v1.0.0` builds and passes the suites (the tag must not point at a broken commit).
- Release notes contain no claim that lacks a recorded verification result.

## 5. Acceptance criteria

- A marker can identify the exact submission revision from the Gitea release page in under a minute.
- Release notes match reality (URLs live, test results recorded, limitations candid).

## 6. Verification without breaking existing functionality

- Tagging is metadata only — no code, no database, no deployment changes.
- If the wrong commit was tagged, move the tag **before anyone pulls it**: `git tag -d v1.0.0; git push origin :refs/tags/v1.0.0`, then re-tag the correct commit. Never move a tag after it has been published as the submission without team agreement.

## 7. Safety notes

- A tag does not alter history, branches, databases, or deployments. The only risk is human: tagging the wrong commit — which subtask 1 prevents by fixing the SHA in writing first.
- Do not create the tag on `feet/Missing-items`; it belongs on the merged `main` history only.
