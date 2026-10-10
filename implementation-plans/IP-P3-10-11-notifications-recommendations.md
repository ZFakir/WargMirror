# IP-P3-10 / P3-11 — Notifications + Recommendations (Post-Submission Options)

**Register item:** MISSING_ITEMS.md §5, P3-10/P3-11 (both already removed from promised feature lists — optional, not deadline work)
**Prerequisites:** IP-00. **Explicitly out of deadline scope**; this plan exists so the choice is deliberate and documented. Elect only after submission.
**Effort:** 1–2 days each.

## 1. What is missing and why it matters for scoring

These features were dropped from the promised feature list, so shipping **without** them is truthful and loses nothing. The scoring relevance is entirely about honesty: they must stay out of docs/README claims until implemented and tested (the register's acceptance line: "only add these back to docs once deployed and tested"). This plan documents what "done" would look like for each, so a post-submission election is cheap to scope.

## 2. Current state (verified)

- `client/sw.js` exists — a service worker is already registered; check what it currently caches/does (precache shell; no push handler expected — verify).
- No VAPID keys, no push-subscription storage, no notification tables/columns (`server/src/models/` — confirmed no subscription model).
- No recommendation endpoint (`server/src/controllers/` — no nearby/spatial query; ARG list supports no ordering beyond defaults).
- No notification or recommendation claims should exist in docs post-P3-13 sweep (verify with a grep during P3-13).

## 3. Implementation subtasks — if elected (post-submission)

### Notifications (P3-10)

1. **Server**: `push_subscriptions` table (via IP-P2-8 framework): `id`, `user_id`, `endpoint` (unique), `keys_p256dh`, `keys_auth`, `created_at`. VAPID keys generated once, stored as env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); **never committed**.
2. **Send path**: `server/src/services/push.js` — `sendToUser(userId, payload)` using `web-push`; call it from the event spots that deserve notifications (friend request received/accepted, ARG published by a friend, flag resolution) — pick one event first.
3. **Client**: permission UX — request permission only from an explicit user action (a settings toggle), never on page load; subscribe in `sw.js` push handler showing the notification; store subscription via API.
4. **Tests**: subscription store/replace/delete; send path with mocked `web-push`; permission-denied graceful state.

### Recommendations (P3-11)

1. **Endpoint**: `GET /api/args/recommended` — start content-based (same mode/genre as the user's completed/liked ARGs); spatial "nearby" requires location consent and a privacy decision (below).
2. **Explainable labels**: UI shows *why* ("Because you completed X") — unexplained recommendations read as random.
3. **Privacy decision (required before any location use)**: explicit consent toggle, coarse precision (neighborhood, not GPS-exact), and a documented retention policy. If consent is declined, fall back to content-based only.
4. **Tests**: recommendation ordering correctness with fixtures; consent-off path returns content-based; no precise coordinates stored.

## 4. Required tests/checks (if elected)

- As listed per feature above; both need full suites green + manual verification on the live deployment **before** any docs re-add the features.

## 5. Acceptance criteria

- **Deadline state (default):** neither feature is claimed anywhere in docs/README; this plan documents the deferral.
- **If elected later:** feature deployed, tested end-to-end, and only then re-added to docs.

## 6. Verification without breaking existing functionality

- Default state requires no code change — a docs-claim grep in IP-P3-13 covers it.
- If implemented: both are additive (new table, new endpoint, new settings toggle); existing flows must pass with features disabled.

## 7. Safety notes

- Push subscriptions contain user-identifying endpoints — treat the table as personal data; document deletion on account removal.
- VAPID private keys in env only; rotating them invalidates existing subscriptions (document the rotation runbook).
- Location-based recommendations: never store raw precise coordinates; aggregate/coarsen server-side before persistence.
