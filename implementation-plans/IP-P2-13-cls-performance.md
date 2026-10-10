# IP-P2-13 — Client-Side Performance (CLS, LCP, Images)

**Register item:** MISSING_ITEMS.md §3, P2-13 (layout stability, image optimization, client perf pass)
**Prerequisites:** IP-00, IP-P1-4 (small payloads make client fixes measurable). Biggest wins after the server payload fix.
**Effort:** 1–2 days.

## 1. What is missing and why it matters for scoring

Lighthouse measured **desktop home CLS ≈ 0.84** (target < 0.1) and mobile LCP ≈ 14 s (target < 2.5 s). The main CLS cause: cover images render without reserved dimensions (`GameCard.js:164-166` — `<img>` with no `width`/`height`), so every loaded image shoves the card grid around; fonts/banners contribute too. LCP was dominated by the 2 MB+ API payload (P1-4), but image weight and render-blocking resources remain after that fix. "Performance optimized with evidence (Lighthouse before/after)" is an explicit rubric criterion — it wants numbers, which this item produces.

## 2. Current state (verified)

- `client/scripts/components/GameCard.js:164-166` — cover `<img>` without `width`/`height`; emoji fallback path exists (no layout shift there).
- Skeletons already exist: `GameCard.renderSkeletons` (L545-561) — use them consistently on every card-feed page before data arrives (check home/catalogue/studio/friend-profile pages for pages that render empty containers instead).
- No picsum/placeholder junk on main; covers come from `api.js:101-104` URL builder.
- Client styles in `client/styles/` — cover container is aspect-driven (`.gc-cover`); the grid already reserves card slots, but the image inside the cover swaps content height.
- Playwright monocart v8 coverage reporter is always on in `client/playwright.config.ts` — adds overhead to every test run (also relevant to IP-P2-15).

## 3. Implementation subtasks

1. **Reserve image space (CLS fix)**: give the cover `<img>` explicit `width`/`height` (or CSS `aspect-ratio` on `.gc-cover img`) so the browser reserves the box before load. Since covers share a fixed aspect, `aspect-ratio` in `client/styles/` (game-card CSS) is the robust fix; verify no distortion with `object-fit: cover`.
2. **Skeleton coverage audit**: ensure every page that renders card grids calls `renderSkeletons` (or equivalent) while fetching — home, catalogue, studio, user-profile, friend-profile. Replace any "empty white area until fetch resolves" pattern.
3. **Image weight**: with IP-P2-9 URLs in place, serve resized covers (e.g. 640w) — if the storage backend can't resize, at least enforce upload-side max dimensions server-side; add `decoding="async"` to images below the fold.
4. **Font/render-blocking pass**: preload the primary font or use `font-display: swap` consistently; defer non-critical scripts (check `<script>` tags in the 10 HTML pages for anything loading synchronously that isn't needed for first paint).
5. **Banner/hero images**: reserve dimensions on any hero/banner above the fold (home page).
6. **Measure**: run Lighthouse mobile + desktop on index/home/catalogue before and after; record scores in the PR (target: CLS < 0.1, LCP < 4 s mobile on the live site post-P1-4).

## 4. Required tests/checks

- Playwright: existing 58 tests green (`--reporter=json`; HTML reporter hangs — known issue).
- New lightweight check: a test asserting `.gc-cover img` has computed aspect-ratio / reserved box (guards regression).
- Visual diff on home + catalogue at desktop and mobile viewport widths (Playwright screenshots) to catch distortion.
- Lighthouse evidence attached to PR.

## 5. Acceptance criteria

- CLS < 0.1 on home and catalogue (desktop; mobile if reachable).
- No unreserved image/layout slots on card grids (code + visual review).
- Lighthouse numbers published in PR before/after.

## 6. Verification without breaking existing functionality

- All Playwright tests pass; screenshots compared.
- Covers with missing/tall/wide images still render via `object-fit: cover` without breaking the grid.
- Emoji-fallback cards (no image) unchanged visually.

## 7. Safety notes

- CSS-only client change; no server, no database, no deploy risk beyond Vercel static deploy.
- Do not lazy-load the LCP hero image if it is above the fold (that would *hurt* LCP) — `loading="lazy"` is correct for card grids, not the hero.
- Keep dark-first theme intact; aspect-ratio changes must not alter themed surfaces.
