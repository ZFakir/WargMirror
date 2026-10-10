# IP-P2-1 — Mitigate or Document Render Cold Starts

**Register item:** MISSING_ITEMS.md §4, P2-1
**Prerequisites:** IP-00 (provides `GET /health`, the correct warm-up/ping target).
**Coordinates with:** IP-P3-13 (known-limitations page must repeat the same policy).
**Effort:** 30–60 minutes plus provider-account access.

## 1. What is missing and why it matters for scoring

The API is hosted on Render's free tier, which sleeps after inactivity. The first live API request measured ≈ **32.7 s** while the service spun up — during a demo or marker walkthrough the app appears broken (catalogue never loads, login "fails"). Availability and UX marks suffer even though the code is fine. This item is either a small hosting decision (paid tier / uptime ping) or a documented warm-up procedure — both are defensible; an undocumented 32-second hang is not.

## 2. Current state (verified)

- Live API: `https://wargmirror.onrender.com` (Render free tier, cold-start sleep behaviour).
- `GET /health` with `{ status: 'ok' }` exists only after Polish-F merges (IP-00) — the ping target for any monitor.
- No uptime monitor is configured anywhere in the repo or documented in `warg-docs/docs/4-deployment/deployment-guide.md`.

## 3. Implementation subtasks

1. **Make the deployment decision with the team** (one of):
   - **A. Paid Render instance** (smallest paid plan) — cold starts disappear; simplest and most reliable for demo day;
   - **B. Free tier + external uptime monitor** (e.g. UptimeRobot/Cron-Job.org) pinging `GET /health` every ~5 minutes to keep the instance warm;
   - **C. Free tier + documented manual warm-up** (open the API URL / run the probe script a few minutes before any demo).
2. **If B:** point the monitor at `https://wargmirror.onrender.com/health`, document the interval and the owner account in the deployment guide (not the credentials).
3. **Update `warg-docs/docs/4-deployment/deployment-guide.md`** with a "Cold starts" subsection stating the chosen policy plainly (e.g. "free tier; an uptime monitor pings /health every 5 min; first request after a long gap may still take ~30 s").
4. **Measure and record** first-request vs warm-request timings after the change (two `curl`/`Invoke-WebRequest` runs, timestamps in the doc or release notes).

## 4. Required checks

- `GET /health` returns 200 within demo tolerance after the mitigation (paid) or within ~1–2 min after the monitor fires (B).
- The deployment guide's statement matches the real deployment configuration (check the Render dashboard setting — instance type, health-check path).

## 5. Acceptance criteria

- Either the first request completes reliably within demo tolerance, or the documented warm-up procedure exists and has been rehearsed once.
- Docs and reality agree — no claim of a monitor that isn't actually configured.

## 6. Verification without breaking existing functionality

- Probes are read-only `GET /health` — zero risk to data.
- Switching Render plans changes billing, not code: no repository changes are required for option A beyond documentation.
- Rollback: remove the monitor entry / revert the doc paragraph.

## 7. Safety notes

- No database interaction at all in this item.
- Keep monitor credentials out of source control; record only the monitor's existence and cadence in docs.
- If option B is chosen, note that Render free-tier apps also spin down regardless of pings if monthly usage limits are hit — record that edge honestly in the guide.
