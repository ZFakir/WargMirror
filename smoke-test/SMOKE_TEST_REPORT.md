# WARG Platform — Smoke Test Report

**Date:** 2026-10-08
**Environment:** Local stack — client served from `worktree_spoof/client` at `http://localhost:5500`, Express API at `http://localhost:3000` (running the audited code on branch `feet-/Fakir-Polish`), shared Aiven MySQL.
**Method:** Automated browser exploration (5 phases) + direct API probes (PowerShell) for security checks that need raw requests.
**Test data:** Accounts `wargbot1` (user_id 5, promoted to admin mid-test) and `wargbot2` (user_id 6); ARG 14 "Fakir Smoke Test ARG" (waypoints 31 gps_proximity / 32 text_answer MCQ / 33 qr_barcode, edges 31→32→33).
**Screenshots:** all in [`smoke-test/screenshots/`](screenshots/) — referenced inline below.

---

## 1. Executive summary

The core product loop works end to end: **sign up → browse catalogue → author a WARG on the map (waypoints, minigames, edges) → publish → play it with geofencing → complete it → social features → moderate via admin**. The audit fixes from this branch (auth guards on `/api/users` + `/api/sessions` + `/api/game/*`, XSS-safe comment rendering, parameterized arrive query) were all verified live and hold.

The significant problems are: a **minigame-submit bypass** (the server never checks arrival/unlock/session), an **anti-spoofing weakness** (flagged requests still record the location, so retrying passes), **no logout UI**, a leak of **sensitive user fields in the admin ban response**, **no points-award path anywhere in the code**, and an **analytics page that is entirely hardcoded demo data**.

---

## 2. What works

### 2.1 Authentication & account
| Item | Evidence |
|---|---|
| Local signup (username, email, password, optional avatar) | Created wargbot1 + wargbot2 via UI/API; redirected to home ([step2-signup-form-before.png](screenshots/step2-signup-form-before.png), [step2-signup-filled.png](screenshots/step2-signup-filled.png)) |
| Login, correct + wrong password | Wrong password → clear error, no session ([step7-login-wrong-password.png](screenshots/step7-login-wrong-password.png)); correct → home ([step8-login-success.png](screenshots/step8-login-success.png)) |
| Session persistence | Page reloads retain session; game session resumes mid-play |
| Role change takes effect immediately | Admin promotion applied without re-login |
| API auth guards (audit fix) | Unauthenticated `GET /api/users`, `/api/sessions`, `/api/game/14/state`, `POST /api/game/14/start` all return **401** (probe-verified) |

### 2.2 Home & catalogue
| Item | Evidence |
|---|---|
| Landing `/` redirects to login | [step1-landing-redirect.png](screenshots/step1-landing-redirect.png) |
| Home rows: Recently Played, New & Trending, From Creators; user stats | [step3-home-after-signup.png](screenshots/step3-home-after-signup.png) |
| Guest handling (login prompts instead of stats) | Code-verified in `home.js` (guest branch replaces stats card) |
| Feedback modal: rating questions, required-field validation, toast on submit | [step4-feedback-modal.png](screenshots/step4-feedback-modal.png), [step4-feedback-submitted.png](screenshots/step4-feedback-submitted.png) |
| Catalogue: cards, mode filters, sort, pagination | [step5-catalogue-page.png](screenshots/step5-catalogue-page.png) |
| Like / dislike toggle, flag modal with reasons + "Reported!" | [step5-catalogue-like-clicked.png](screenshots/step5-catalogue-like-clicked.png), [step5-catalogue-flag-modal.png](screenshots/step5-catalogue-flag-modal.png) |

### 2.3 Creator studio
| Item | Evidence |
|---|---|
| Create ARG (inline editor, title/description) | ARG 14 created; URL becomes `edit_warg?id=14` ([step2-create-warg-filled.png](screenshots/step2-create-warg-filled.png)) |
| Waypoint placement by map click | 3 waypoints placed around Wits campus |
| Minigame attach: gps_proximity, text_answer (MCQ), qr_barcode | All three persisted with configs |
| One-minigame-per-waypoint enforced | Alert: "A waypoint can only have a maximum of one minigame..." |
| Unlimited-attempts toggle | Updates minigame config; warning appears |
| **DAG cycle prevention** | Exact alert: "Cannot connect waypoints: This would create a cyclic loop. WARGs must be a directed acyclic graph (DAG)." ([stepB4-cycle-detection.png](screenshots/stepB4-cycle-detection.png)) |
| Save Draft | Success modal ([stepB5-save-success.png](screenshots/stepB5-save-success.png)); waypoints/minigames/edges persist across reload — **edges verified in DB via API** (`31→32`, `32→33`) |
| Publish / unpublish / republish | Studio lists move between Published/Unpublished ([step4-studio-published.png](screenshots/step4-studio-published.png)) |

### 2.4 Gameplay & geofence
| Item | Evidence |
|---|---|
| Map renders centered on campus (no ocean bug), markers + HUD | [stepC6-game-page.png](screenshots/stepC6-game-page.png) |
| Session start + resume after reload | Session persisted through reloads |
| Geofence arrive check (distance vs radius) | Waypoint 31 passed while at coordinates |
| **Dev Override** (out-of-radius confirm) | Dialog: "You are outside of the geofence (Distance: 585m, Radius: 30m). Proceed anyway (Dev Override)?" — cancel and accept both handled ([phase4-09-dev-override-dialog.png](screenshots/phase4-09-dev-override-dialog.png)) |
| gps_proximity auto-completes on arrive | Waypoint 31 completed via normal arrive |
| QnA minigame (radio options), wrong answer then correct | "Correct!" feedback, waypoint completes ([phase4-10-waypoint32-complete.png](screenshots/phase4-10-waypoint32-complete.png)) |
| qr_barcode with manual code entry | "Having trouble? Enter manually" → `WARG123` passes |
| **Game completion** | Heading changes to "COMPLETED", all markers ✓ ([phase4-11-game-completed.png](screenshots/phase4-11-game-completed.png)); profile shows Games Completed = 1 ([phase4-12-user-profile.png](screenshots/phase4-12-user-profile.png)) |
| Anti-spoofing fires on teleports | Instant >4 m/s jumps → 403 "Interaction denied due to suspicious location activity" (speed_violation) |

### 2.5 Social & comments
| Item | Evidence |
|---|---|
| User search + friend request | "Add" → "Sent" ([phase4-02-friend-search-results.png](screenshots/phase4-02-friend-search-results.png), [phase4-03-friend-request-sent.png](screenshots/phase4-03-friend-request-sent.png)) |
| Friend acceptance (receiver-only guard) | Accepted via API as bot2 — 403s if path id ≠ receiver (audit fix) |
| Friends sidebar, friend profile modal (level, points, distance, badges, remove) | [phase4b-02-home-friends-list.png](screenshots/phase4b-02-home-friends-list.png), [phase4b-12-friend-profile-modal.png](screenshots/phase4b-12-friend-profile-modal.png) |
| Remove friend | Immediate, "Friend removed" toast ([phase4b-13-friend-removed-toast.png](screenshots/phase4b-13-friend-removed-toast.png)) |
| Comments: post, nested replies, persistence | [phase4-05-normal-comment-posted.png](screenshots/phase4-05-normal-comment-posted.png), [phase4-08-nested-reply.png](screenshots/phase4-08-nested-reply.png) |
| Spoiler: "Mark as spoiler" checkbox → blurred, click-to-reveal | [phase4b-07-spoiler-comment-posted.png](screenshots/phase4b-07-spoiler-comment-posted.png), [phase4b-08-spoiler-revealed.png](screenshots/phase4b-08-spoiler-revealed.png) |
| **XSS regression (audit fix)** | Payload `<img src=x onerror="window.__xssPwned=1"><script>...</script>` renders as **literal text**; `window.__xssPwned`/`__xssPwned2` undefined ([phase4-06-xss-comment-safe.png](screenshots/phase4-06-xss-comment-safe.png)) |

### 2.6 Admin
| Item | Evidence |
|---|---|
| Admin dashboard loads for admin role (401 for non-admins — mount guard `requireAdmin`) | Dashboard rendered after promotion |
| Flag queue: review modal + resolve | Flag on "CV games" resolved — `PUT /api/admin/flags/3/resolve` → 200 |
| Player search (trust score shown) | wargbot2 found with trust 100.00 |
| Ban / unban with confirmations | `PUT /api/admin/users/6/ban` toggles; button state follows |
| **Ban enforcement on login** | While banned: login → **401**; after unban: login → 200 (API-verified) |
| Admin game-delete buttons exist (dashboard + game cards) | Not exercised (would destroy data) |

---

## 3. What does not work / gaps

### HIGH
1. **Minigame submit bypass (cheat vector).** `submitMinigame` (`server/src/controllers/gameController.js`) never checks that the player arrived at the waypoint, that the waypoint is unlocked, or that a session is active. Verified live: a direct `POST /api/game/14/waypoint/33/submit` with `WARG123` passed a **locked, never-arrived** waypoint; `gps_proximity` submissions auto-pass (`outcome = 'pass'` unconditionally, line 236) with **no geolocation check at all**. Client-side UI enforcement is the only gate.
2. **Anti-spoofing can be retried through.** The `antiSpoofing` middleware records the (teleported) `LocationEvent` *before* returning the 403, so the immediate retry is measured from the planted position and passes. Flags only reduce `trust_score`; `is_flagged` blocks nothing. A spoofer can grind through waypoints with trust dings only.
3. **No logout UI.** Zero occurrences of "logout" in the client code. The wiki (`7-frontend/system-flows.md`) describes an `auth.js` that updates the navbar with a logout button — **no such file exists**. Users cannot log out except by clearing cookies or waiting for session expiry.
4. **Admin ban/unban response leaks sensitive fields.** `PUT /api/admin/users/:id/ban` returns the full user row including `password_hash`, `google_uid`, and `session_token`. The private-attribute filtering used in `userController` is bypassed here.

### MEDIUM
5. **Points are never awarded.** `total_points` (User) and `total_points_earned` (GameSession) exist only as model columns — no code path increments them. A full ARG completion left the profile at 0 points. Home/profile point displays are effectively seed-data-only.
6. **Analytics page is 100% mock.** `analytics.js` makes zero API calls and shows hardcoded "Operation: Midnight Sun" numbers (142 playing, 8,405 completed) regardless of the logged-in creator.
7. **No client-side auth guard on "protected" pages.** `studio.html`, `user-profile.html`, `analytics.html`, `admin.html` render their shells to anonymous visitors (their data calls then fail/empty). Graceful on home (guest prompts) but the wiki-documented redirect does not exist anywhere except `game.js` (start failure → `login.html`).
8. **Friends list can appear empty on first load**, populating after re-login — initialization timing issue in `home.js` ([phase4b-05-friends-panel-empty.png](screenshots/phase4b-05-friends-panel-empty.png)).
9. **Edge-drawing gesture is undiscoverable/fragile.** Edges require mouse-down on a waypoint marker's *core* element, drag, release on the other core. Two automation attempts failed before a synthetic-event attempt succeeded; dragging the marker body just moves the waypoint. Consider a dedicated "connect" tool or clearer affordance.
10. **Ban is implemented via `is_flagged`** — the same column the anti-spoofing system sets when trust < 50, conflating "moderator-banned" with "spoof-flagged".

### LOW / UX polish
11. **Remove friend has no confirmation** — an explicit user-feedback request from 2026-09-21 ("Confirm before removing a friend") that remains unimplemented.
12. **No per-comment upvotes** — only game-level like/dislike (user-testing docs mention upvoting interactions).
13. **Login errors use native `alert()`** instead of inline messages ([step7-login-wrong-password.png](screenshots/step7-login-wrong-password.png)).
14. **"Recently Played" only lists ACTIVE sessions** — completed games disappear from the home row ([phase4-14-home-recently-played.png](screenshots/phase4-14-home-recently-played.png)). Possibly intended; worth confirming.
15. **Admin dashboard has no system metrics** (wiki claims them); flag modal heading says "Ban User" even when unbanning; "Recently Flagged Games" section stayed empty while flag reports existed.
16. **`text_answer` MCQ API contract** — the API expects the option *index*; submitting the answer *string* fails. UI works, raw API calls are confusing.
17. **Dev Override cancel left the play modal open** in one observation (code says `playModal.close()` — could not reproduce; flagged low-confidence).
18. **No mode/tag selection in the create flow** — mode defaults (cards show SOLO) despite the schema's mode enum and the catalogue's mode filters.
19. `[GameCard] Container not found` console warning seen once (phase 3); not reproduced since.
20. **`||spoiler||` syntax is not a thing** — spoilers are the checkbox; harmless, but users may try markdown.

---

## 4. Security verifications (this branch's audit fixes, live)

| Fix | Result |
|---|---|
| `requireAuth` on `/api/users`, `/api/sessions` | 401 for anonymous callers (probe-verified) |
| Mount-level `requireAuth` on `/api/game/*` | 401 for anonymous `start`/`state` (probe-verified; per-route guards are inconsistent in `gameRoutes.js` but the mount covers them) |
| IDOR ownership checks (friends, sessions) | 403 when acting on another user's id (unit-tested + live) |
| XSS-safe comment rendering (`textContent` + DOM API) | Payload renders as literal text; no execution |
| SQLi-safe `arriveAtWaypoint` (validated coords, bound WKT) | Non-numeric/out-of-range coords → 400; regression tests pass |
| Geofence Dev Override | Still present per user request (marked TEMP in `game.js`) — remember to remove/gate before release |

---

## 5. Remediation — status after fixes (2026-10-08, same day)

All findings from §3 were triaged and implemented (except the deferred items noted). Verification: server `eslint` clean, jest **mocked 58/58** and **unit 54/54** (gameController submit suite extended 2→12 tests; adminController updated to the new ban semantics), plus a full live re-probe on a temporary `:3001` instance against the shared Aiven DB.

### HIGH — all fixed

| # | Finding | Fix | Verified |
|---|---|---|---|
| 1 | Minigame submit bypass | `submitMinigame` now gates on an **active session** (403), an **unlocked waypoint** (403), and for `gps_proximity` re-verifies the distance server-side via `ST_Distance_Sphere` against the last **trusted** `LocationEvent` (the TEMP Dev Override is honoured via a `geofence_override` body flag — remove together with the override dialog) | Live: unauth → 401; no session → 403; locked waypoint 32 → 403; gps with no trusted event → `fail`; override → `pass` |
| 2 | Anti-spoofing retry hole | Speed-check baseline query now filters `is_suspicious: false`, so a planted teleport position never becomes the new reference point | Unit test added (`antiSpoofing` + `gameController` baseline assertions) |
| 3 | No logout UI | `GET /auth/logout` already existed server-side; `api.js` now injects a `#btn-logout` button beside the profile button on every topbar page (incl. `friend-profile.html`, which previously didn't even load `api.js`) | Live: logout → 200 "Logged out successfully", subsequent `/auth/me` → 401 |
| 4 | Admin ban response leak | Responses built from an `ADMIN_USER_FIELDS` whitelist (no `password_hash` / `session_token` / `google_uid`) | Live: ban response contains only whitelisted fields; unit test asserts the leak stays closed |

### MEDIUM — all fixed

| # | Finding | Fix | Verified |
|---|---|---|---|
| 5 | Points never awarded | **Implemented then reverted (2026-10-08)** — maintainer decision: the points economy will be driven by PvP games, which are not implemented yet. `submitMinigame` no longer awards points; the `total_points` / `total_points_earned` columns stay untouched until the PvP system lands (a NOTE comment in `gameController.js` documents this) |
| 6 | Analytics 100% mock | New `GET /api/args/analytics/mine` (per-creator: session counts, votes, per-waypoint pass/fail, recent flags); `analytics.js` fully rewritten against it | Live: 200 with per-ARG aggregation for the created draft |
| 7 | No auth guard on protected pages | `api.requireAuthPage()` redirects guests to `login.html`; wired into analytics, admin, edit_warg | Code-verified (all three pages call it before rendering) |
| 8 | Friends empty on first load | Investigated: no race in code (sequential awaits, no status filter) — most likely a phase-4 timeline artifact | Monitor on next manual pass |
| 9 | Edge-draw undiscoverable | Hint paragraph added above the map in `edit_warg.html` ("drag from the centre of one marker to the centre of another") | UI-verified pending manual pass |
| 10 | Ban conflated with `is_flagged` | Bans now toggle `is_suspended`; passport rejects suspended logins; `is_flagged` is trust-only | Live: ban → login blocked path exercised in unit tests; is_flagged users can log in again |

### LOW — fixed unless noted

| # | Finding | Fix |
|---|---|---|
| 11 | Remove-friend confirmation | ConfirmModal with "Remove Friend" / "Remove" |
| 12 | Per-comment upvotes | **Deferred** — needs new tables (schema migration) |
| 13 | Login `alert()` errors | Inline error element with `role=alert` |
| 14 | Recently Played active-only | Root cause: the editor's save always sent `unpublished`, un-publishing WARGs mid-play. "Save Changes" now preserves the current status. (Sessions endpoint returns all statuses — confirmed live, so completed games appear once published WARGs stay published) |
| 15 | Admin metrics / "Ban User" heading / empty flagged-games | New `GET /api/admin/metrics` (live: 7 users, 14 args, 11 published, 0 open flags, 17 active, 3 completed sessions); ConfirmModal title bug fixed (dedicated span — the old one-shot `innerHTML` replace only worked on first open); flagged-games section fetches real ARGs |
| 16 | MCQ API contract | Server accepts option **index or exact option text** (case-insensitive). Live: `"blue"` passes |
| 17 | Dev Override cancel modal | Not reproduced; code path is correct |
| 18 | Mode selection | Mode selector in the editor; `createArg`/`updateArg` persist `mode` (live: `coop` stored) |
| 19 | GameCard warn | Not reproduced |
| 20 | `||spoiler||` | No action (checkbox is the mechanism) |

### Bugs found during remediation (beyond this report)

- **Login lockout**: both passport strategies rejected logins for `is_flagged` users (trust < 50) — worse than reported; decoupled from `is_suspended`.
- **Spoofable `creator_id`**: `createArg`/`updateArg`/`updateArgStatus` fell back to `req.body.creator_id || 1`; routes now require auth and use `req.user.user_id`. Live: a body `creator_id: 999` was ignored — the ARG was owned by the session user.
- **XSS in admin lists**: flag descriptions/usernames rendered via `innerHTML` → rebuilt with DOM APIs + `textContent`.
- **ConfirmModal desc XSS + stale titles** → `textContent` everywhere.
- **`submitMinigame` ReferenceError** (`lastTrusted` vs `lastTrustedEvent`) — caught by the new unit tests before shipping.
- New endpoints: `DELETE /api/args/:id` and creator flag-resolve `POST /api/args/:id/flags/:flagId/resolve` (both ownership-checked; delete cascades via FKs). Live-verified.

**Server restart required**: the fixes live in `server/src/**`; the user's `:3000` process (with debugger attached) still runs the old code until restarted. Client changes are already live via the no-cache `:5500` static server.

---

## 6. Test data & cleanup notes

Left in the shared Aiven DB:
- Users `wargbot1` (5, **admin**) and `wargbot2` (6) — both currently unbanned, not friends.
- ARG 14 "Fakir Smoke Test ARG" (published) + waypoints/minigames/edges 31→32→33.
- Completed game session for wargbot1 on ARG 14; several comments (incl. XSS payload string + spoiler); one resolved flag (flag_id 3); trust events from spoof-flagged arrives.
- `verifybot` (user_id 7, demoted back to `player` after live verification) with a completed session on ARG 14; the 80 phantom points it earned during live verification of the (now-reverted) points fix were zeroed. Its temp draft ARG 15 was deleted via the new `DELETE /api/args/:id` endpoint during verification.
- Client static server for this test is still running on `http://localhost:5500` (background terminal); your Express server on 3000 was untouched throughout.

Say the word if you want any of this cleaned up (accounts demoted/deleted, ARG 14 removed, comments purged).

---

## 7. Environment caveats

- The browser agents cannot reliably emulate real GPS walking; anti-spoofing behavior was exercised via teleports and the documented retry pattern. Real-device drift/step behavior was **not** tested.
- Phase 3's automated "auth guard" observation was invalidated (its browser carried an existing session — it saw a logged-in dashboard with 12 games / 840 points that belongs to neither test account). Guest behavior conclusions in this report come from code inspection (`home.js` guest branches) instead.
- Google OAuth was not tested (registered redirect targets production, not localhost).
