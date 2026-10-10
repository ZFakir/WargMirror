# IP-P3-9 — Final Realtime/Co-op Scope Decision

**Register item:** MISSING_ITEMS.md §5, P3-9 (Socket.io is a stub; co-op modes imply realtime)
**Prerequisites:** IP-00 (Polish-F documents Socket.io as a stub). Decision item — recommendation included.
**Effort:** 1–2 hours for Option A; 1–2 days for Option B.

## 1. What is missing and why it matters for scoring

The app exposes co-op/live modes that can read as realtime collaboration, but the backend has only a Socket.io stub — no rooms, no broadcasts, no server-authoritative sync. A marker testing "co-op" with two browser sessions will find silent desync, which reads as a broken feature rather than an unimplemented one. The scoring principle (same as P3-8): no claim may suggest live synchronization unless an end-to-end test proves it.

## 2. Current state (verified)

- `socket.io ^4.7.5` is in `server/package.json` dependencies; a stub socket setup exists server-side (documented as such by Polish-F).
- No room/join/broadcast logic in `server/src/` (no room handlers; grep `socket` in controllers during subtask 1 to confirm exact surface).
- Client: domination/location pings (e.g. the `dominationPing` route from Polish-F) are HTTP polling, not sockets; `GameCard` MODE config includes `coop` and `live` labels (`GameCard.js:19-44`) — visible to any marker browsing the catalogue.
- Session tracking (join/play/progress) is DB-backed and per-user, not synchronized between participants.

**Recommendation: Option A — retain the honest scaffold.** Implementing viable co-op (rooms, auth'd join, server-authoritative completion broadcasts, throttled location sync, teammate map markers, two-context tests) is 1–2 days of the riskiest kind of work (new realtime surface + new tests) this late in the milestone, for a feature no rubric line explicitly demands.

## 3. Implementation subtasks

### Option A — Honest scaffold (recommended)

1. **Audit the claims**: grep client copy + docs for wording implying live collaboration ("play together in real time", "live session", "join your friends live", etc.) across `client/`, `warg-docs/docs`, README.
2. **Label, don't remove**: keep co-op/live modes (they are playable solo/async today) but adjust copy so they describe what exists — e.g. "Co-op (turn-sharing)" if that is the actual behaviour, or add a small "Live sync coming post-submission" badge on live-labelled content. Removing modes shrinks the feature list the rubric can credit; honest labelling keeps the credit and kills the false claim.
3. **Known-limitations entry** (feeds IP-P3-13): "Socket.io scaffold present; session tracking is per-user DB state, not live synchronization; co-op modes are playable but not realtime."
4. **Verify**: two-browser manual test (two sessions on the same ARG) documenting actual behaviour matches the new copy.

### Option B — Minimum viable co-op (only with team sign-off + schedule room)

1. **Rooms keyed by session**: socket namespace `session:<id>`; join requires auth (cookie/JWT handshake auth middleware on the socket — reuse existing auth).
2. **Server-authoritative events**: completion/broadcast events emitted from the same transaction that writes completion (IP-P2-10 pattern) so clients cannot spoof progress.
3. **Throttled location updates**: client emits position at most 1×/2 s; server validates bounds (reject absurd jumps) before rebroadcasting to room.
4. **Teammate markers**: MapModal renders other participants' markers from socket events.
5. **Two-context tests**: Playwright two-context test proving an action in context A appears in context B; failure of the socket server must not break single-player flows (graceful degrade to polling).

## 4. Required tests/checks

- Option A: claim-audit grep results in PR; copy changes reviewed; full client suite green; two-session manual behaviour documented.
- Option B: two-context Playwright test; socket-down degradation test; full suites green; manual two-device/browser pass.

## 5. Acceptance criteria

- No copy, UI label, or doc suggests live synchronization unless Option B shipped with its two-context test.
- Decision + rationale recorded (PR description + known-limitations doc).

## 6. Verification without breaking existing functionality

- Option A is copy-only; regression risk nil — run the game-flow tests.
- Option B: sockets must be additive — the HTTP flows today keep working with the socket server disabled (test this explicitly).

## 7. Safety notes

- Option B touches the live location path — keep the existing HTTP `dominationPing` fallback intact; never make gameplay depend on socket connectivity.
- Do not expose other users' precise locations beyond the session room (privacy): broadcast only within the room, only while the session is active.
- If Option B is attempted and stalls, fall back to Option A copy changes — a documented limitation scores better than a half-wired realtime layer.
