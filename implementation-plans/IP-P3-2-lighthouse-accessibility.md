# IP-P3-2 — Resolve Remaining Lighthouse Accessibility Failures

**Register item:** MISSING_ITEMS.md §5, P3-2 (contrast, label-name mismatch, ARIA roles, heading order)
**Prerequisites:** IP-00, IP-P3-1 (skip links/focus fixes remove a class of failures before this pass).
**Effort:** 4–6 hours + measurement time.

## 1. What is missing and why it matters for scoring

Live Lighthouse audits found **35 colour-contrast failures on home, 21 on catalogue**, plus `label-content-name-mismatch` (25 elements), `aria-allowed-role` (12), `aria-hidden-focus`, heading-order and ARIA-child violations. Polish-F improved auth-page accessibility but did not touch page-level failures. The rubric scores accessibility with measurable targets; this item is the cleanup pass that produces the "Lighthouse a11y ≥ 95" evidence.

## 2. Current state (verified)

- Measured (assessment, pre-Polish-F): home a11y failures dominated by contrast (35) and label-name mismatch (25); catalogue contrast (21); `aria-allowed-role` (12) elements (likely `role="listitem"`/`role` misuse on card elements — `GameCard.js:160` sets `role="listitem"` on `<article>` which is allowed, but the audit flagged others — re-measure first).
- Design tokens live in `client/styles/` (dark-first theme, CSS custom properties) — the correct fix layer for contrast.
- `GameCard.js` markup uses `aria-label` on buttons whose visible text differs (mismatch source candidates at L219-250: `aria-label="Like"` + count text; visible name computation must include the count or the label must match).
- Home/catalogue markup and scripts: `client/home.html`, `client/catalogue.html` + their page scripts in `client/scripts/pages/` (or equivalent locations).

## 3. Implementation subtasks

1. **Re-baseline after IP-00 and IP-P3-1**: run Lighthouse (mobile + desktop) on home, catalogue, login, signup, and the game flow; export the failing-node JSON for each page. Work from the exported list, not memory — the Polish-F merge may have shifted numbers.
2. **Contrast fixes at the token level** (`client/styles/`): map every failing colour to its design token; adjust token values to WCAG AA (4.5:1 normal text, 3:1 large text ≥ 18pt/14pt-bold). Prefer token changes over per-component overrides — one token fix repairs many components, and it keeps the dark-first theme coherent.
3. **Label/name mismatches**: for icon buttons with counts (like/dislike in `GameCard.js` L231-241), either make the accessible name include the visible count (`aria-label="Like, 12"`) or drop `aria-label` and let content compute; ensure `aria-pressed` semantics stay. Apply the same rule to flag/remove/publish buttons.
4. **Invalid roles**: remove/repair `aria-allowed-role` violations (e.g. roles on elements whose implicit role conflicts); fix `aria-hidden-focus` (focusable descendants inside `aria-hidden` containers — candidates: the game-card menu dropdown at `GameCard.js:184-190` uses `aria-hidden` toggling on a container holding a focusable button; ensure hidden state also removes focusability, e.g. `display:none` or `inert`).
5. **Heading order + ARIA children**: correct skipped levels (h1→h3) on home/catalogue; fix list/listitem parent-child structure.
6. **Automated guard**: add `@axe-core/playwright` (or Playwright's built-in) axe scan to the key page tests (home, catalogue, login, game open) asserting zero *critical/serious* violations — this makes the improvement durable (feeds IP-P2-15's de-placeholdering with meaningful assertions).

## 4. Required tests/checks

- axe-in-Playwright assertions pass on key pages (zero critical/serious).
- Full Playwright suite green (`--reporter=json`).
- `cd client; npm run lint`.
- Lighthouse re-run: a11y ≥ 95 on home, catalogue, login, signup; results exported into the PR and (later) the docs evidence (IP-P3-13).

## 5. Acceptance criteria

- Lighthouse accessibility ≥ 95 on home, catalogue, login, signup; no critical axe violations on the game flow.
- All contrast fixes are token-level (no scattered one-off colors).
- Axe assertions run in CI (via the client suite).

## 6. Verification without breaking existing functionality

- Visual regression pass on home/catalogue (screenshots before/after at desktop + 360px widths) — token changes can shift the theme's feel; review as a team.
- All existing tests pass; axe additions only assert, they don't alter behavior.
- Dark-first check: verify no light-theme breakage if a theme toggle exists.

## 7. Safety notes

- CSS/markup-only client change; no server or database impact.
- Resist redesign temptation: adjust token *values* and markup semantics, not the design system structure (that is a bigger project).
- If a colour is brand-fixed and cannot reach AA, document the exception in the PR rather than shipping a silent failure.
