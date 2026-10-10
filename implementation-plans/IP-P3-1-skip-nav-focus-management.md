# IP-P3-1 — Skip Navigation + Modal Focus Management

**Register item:** MISSING_ITEMS.md §5, P3-1 (skip link + focus trap/return in modals)
**Prerequisites:** IP-00. Client-quality track; coordinate with IP-P3-3 (shared modal/toast primitives).
**Effort:** 4–6 hours.

## 1. What is missing and why it matters for scoring

Keyboard and screen-reader users must tab through the entire header/nav on every page (no skip link), and modal dialogs do not manage focus: opening a modal leaves focus on the trigger behind the overlay, Tab can escape into background content, and closing does not return focus. These are core WCAG 2.4.1 (Bypass Blocks) and 2.4.3 (Focus Order) failures that axe/Lighthouse flag directly — accessibility is a named rubric criterion with measurable targets (P3-2 wants Lighthouse a11y ≥ 95).

## 2. Current state (verified)

- All 10 main pages (`client/*.html`) have `<main id="main-content">` — the skip-link target already exists; **zero** skip links exist anywhere.
- `client/scripts/components/ConfirmModal.js` — `open()` (L108-118) does not move focus into the dialog; only Escape closes (L78-82); no focus trap; no focus return. Singleton at L129.
- Modals listed in the register: `MapModal.js`, `PlayModal.js`, `FlagModal.js`, `PublishModal.js`, `RemoveModal.js` (in `client/scripts/components/`) — same expected gaps (verify each; MapModal is special: it is a map overlay, ensure it is marked `role="dialog"` with `aria-modal` or documented as non-modal).
- `GameCard.js` dynamically loads FlagModal/RemoveModal/ConfirmModal via script injection or `import()` (L320-347, L373-382) — focus logic must live inside the components, not the loaders.

## 3. Implementation subtasks

1. **Shared focus utilities** — new `client/scripts/components/focusUtils.js`:
   - `trapFocus(dialogEl)` — keydown handler cycling Tab within the dialog (wrap first↔last), ignore if dialog closed.
   - `openDialogFocus(dialogEl, triggerEl)` — store `triggerEl` on the instance, focus the dialog (or `[autofocus]`/first focusable).
   - `closeDialogFocus(dialogEl)` — remove trap, restore focus to stored trigger.
   - Also handle `aria-hidden` on background app root while a modal dialog is open (standard accessible-modal pattern), or ensure the overlay makes background inert.
2. **Skip link**: add as the first element of `<body>` on every page in `client/*.html`:
   - `<a href="#main-content" class="skip-link">Skip to main content</a>`; visually hidden until `:focus` (CSS in `client/styles/` — the design-token/cascade-layers system; add a `@layer` appropriate rule).
   - Target `<main id="main-content">` needs `tabindex="-1"` so focus lands there programmatically.
   - All 10 pages: `index, login, signup, home, catalogue, game, create_warg, edit_warg, studio, settings, user-profile, friend-profile, admin, analytics` — generate via `client/update_nav.py` if that is the nav source of truth (coordinate with IP-P3-6 subtask 4), otherwise edit each HTML file directly and keep them consistent.
3. **Wire each modal** (`ConfirmModal.js`, `FlagModal.js`, `RemoveModal.js`, `PlayModal.js`, `PublishModal.js`): call the shared utilities in `open()`/`close()`; ensure `role="dialog"`, `aria-modal="true"`, and an accessible name (`aria-label` or `aria-labelledby` pointing at the dialog title).
4. **MapModal**: if it behaves as a non-modal overlay, give it `role="dialog"` without `aria-modal`, or document why not; keyboard users must still reach its close/minimize control (per P3-7 the map must remain minimizable post-IP-00).
5. **Escape handling parity**: every dialog closes on Escape and returns focus (ConfirmModal already has Escape at L78-82 — extend, don't duplicate).

## 4. Required tests/checks

- New Playwright keyboard tests (chromium): skip link is first tab stop and moves focus to `#main-content`; open ConfirmModal → Tab cycles inside → Escape → focus back on trigger; same for Flag/Remove/Play/Publish flows that are reachable in tests.
- Existing 58 tests green (`--reporter=json`).
- `cd client; npm run lint`.

## 5. Acceptance criteria

- Every page has a functioning skip link reaching `<main id="main-content">`.
- Every modal traps Tab, names itself, closes on Escape, and returns focus to its trigger.
- No keyboard path enters hidden background content while a modal is open.

## 6. Verification without breaking existing functionality

- Visual check that skip link only appears on focus (no layout shift for mouse users).
- Mouse flows unchanged (focus management is additive).
- axe/Lighthouse re-run shows Bypass Blocks + Focus Order violations cleared (feeds P3-2 numbers).

## 7. Safety notes

- Client-only change; no server/database/deploy risk beyond the Vercel static deploy.
- Do not change modal z-index/overlay click-outside behavior in this PR — focus work only; visual behavior changes belong to their own review.
- Keep the dynamic-import loaders in `GameCard.js` untouched — components own their focus logic.
