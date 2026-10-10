# IP-P3-7 — Complete Responsive Validation

**Register item:** MISSING_ITEMS.md §5, P3-7 (360px/768px/desktop pass on key flows)
**Prerequisites:** IP-00 (map modal behaviour changes with Polish-F), IP-P2-13 (layout stability) — responsive fixes build on stable layout.
**Effort:** 3–5 hours.

## 1. What is missing and why it matters for scoring

Responsive design is a rubric criterion ("mobile-first / responsive layouts"), and the measured 14 s mobile LCP shows the mobile experience matters. There has been no systematic multi-viewport pass: overflow, clipped text, sub-44 px tap targets, and the map modal's mobile behaviour are unverified. Markers commonly resize the browser to phone width — anything broken there is immediately visible.

## 2. Current state (verified)

- No viewport-matrix test evidence exists in `smoke-test/` (49 screenshots exist but from single-viewport smoke runs — check their sizes during subtask 1).
- Playwright config (chromium+firefox) has no per-viewport projects; tests run at default desktop size.
- Map modal (`client/scripts/components/MapModal.js`) has minimize/close controls — post-Polish-F behaviour unverified on small screens.
- Tap-target sizes for card action buttons (`GameCard.js` L216-251, `.gc-action` styles in `client/styles/`) unmeasured — icon buttons at 14 px icons risk < 44 px hit areas.
- Register requires testing catalogue, play, studio, analytics at 360×640, 768×1024, desktop.

## 3. Implementation subtasks

1. **Playwright viewport matrix**: add a mobile-viewport project (or per-test viewport override) covering catalogue, game/play, studio, analytics at 360×640 and 768×1024; keep existing desktop project. Capture screenshots into `smoke-test/` (or `client/test-results/`) as evidence.
2. **Fix overflow/clipping**: run the matrix; for each failure fix CSS in `client/styles/` (token-aware, dark-first intact): horizontal scroll offenders, text clipping in cards/titles, modals exceeding viewport height (make modal content scrollable, cap at `100dvh`).
3. **Tap targets**: audit buttons/links in the tested flows; enforce ≥ 44×44 px via padding/min-size in styles (`.gc-action`, nav items, modal buttons, map controls) without changing visual size destructively (padding expansion, not layout breakage).
4. **Map modal mobile**: verify minimize/close reachable at 360px; verify the map canvas resizes with the viewport (leaflet/map lib `invalidateSize` if used); fix z-index/overlap with the bottom nav if present.
5. **Update evidence**: refresh the smoke-test screenshots for the final flows and note viewport sizes in filenames (e.g. `catalogue-360x640.png`); reference them from the docs (feeds IP-P3-13).

## 4. Required tests/checks

- New Playwright assertions: no `document.documentElement.scrollWidth > window.innerWidth` on the tested pages at 360px and 768px; map modal minimize button visible/tappable at 360px.
- Full suite green at both viewport configs (`--reporter=json`).
- `cd client; npm run lint`.

## 5. Acceptance criteria

- No horizontal overflow or inaccessible essential control in catalogue, play, studio, analytics at 360×640, 768×1024, desktop.
- Tap targets ≥ 44 px in tested flows.
- Screenshot evidence committed for the matrix.

## 6. Verification without breaking existing functionality

- Desktop screenshots before/after (visual diff) to confirm no desktop regression from mobile-target CSS changes.
- Full suite at desktop unchanged; new mobile assertions additive.
- Manual device pass if available (or DevTools device emulation for touch).

## 7. Safety notes

- CSS-only client changes; no server/database.
- Avoid viewport-meta changes unless missing — verify `client/*.html` all declare `<meta name="viewport" content="width=device-width...">` first (adding it late can shift the entire layout and break desktop assumptions elsewhere).
- Do not hide essential functionality on small screens to "fix" overflow — fix the layout.
