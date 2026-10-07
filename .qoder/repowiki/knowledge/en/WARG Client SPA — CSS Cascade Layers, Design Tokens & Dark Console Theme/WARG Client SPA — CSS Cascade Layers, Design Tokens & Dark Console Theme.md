---
kind: frontend_style
name: WARG Client SPA — CSS Cascade Layers, Design Tokens & Dark Console Theme
category: frontend_style
scope:
    - '**'
source_files:
    - client/styles/tokens.css
    - client/styles/home.css
    - client/styles/login.css
    - client/styles/game.css
    - client/styles/admin.css
    - client/styles/catalogue.css
    - client/styles/studio.css
    - client/styles/profile.css
    - client/styles/analytics.css
    - client/styles/edit_warg.css
    - client/styles/map-modal.css
    - client/styles/components/flag-modal.css
    - client/styles/components/publish-modal.css
    - client/styles/components/remove-modal.css
---

## Approach

The WARG client is a vanilla HTML/JS multi-page application (no React/Vue/Svelte). Styling is done with plain CSS files loaded per page, organized around **CSS Cascade Layers** (`@layer`) and a centralized **design-token** system. There is no CSS-in-JS, no SCSS preprocessor, no Tailwind, and no component library — only hand-written CSS.

## Key Files

- `client/styles/tokens.css` — single source of truth for colors, typography, spacing, radii, shadows, transitions, layout dimensions; declares the layer order `reset → base → tokens → components → utilities`.
- `client/styles/home.css` (~1500 lines) — app shell, sidebar, topbar, game canvas, right panel, modals, responsive breakpoints; the largest file and de-facto global stylesheet.
- Per-page stylesheets: `admin.css`, `analytics.css`, `catalogue.css`, `edit_warg.css`, `game.css`, `login.css`, `map-modal.css`, `profile.css`, `studio.css`.
- `client/styles/components/` — shared modal fragments: `flag-modal.css`, `publish-modal.css`, `remove-modal.css`.
- Each `.html` entry in `client/` (`index.html`, `home.html`, `game.html`, etc.) links the relevant CSS via `<link>` tags.

## Architecture & Conventions

### Cascade Layer Order
Every stylesheet begins with an identical layer declaration:
```
@layer reset, base, tokens, components, utilities;
```
This enforces a strict cascade: resets first, then base element styles, then design tokens (custom properties), then component rules, then utility classes. The order is declared explicitly in both `tokens.css` and `home.css` (and mirrored in other page stylesheets).

### Design Tokens (`--color-*`, `--space-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`)
All visual values flow through CSS custom properties defined on `:root` inside the `@layer tokens` block of `tokens.css`. Components never hard-code hex colors or pixel spacings — they reference variables like `var(--color-bg-card)`, `var(--space-3)`, `var(--radius-btn)`, `var(--duration-normal)`, `var(--ease-out)`.

Tokens are grouped by concern:
- **Color palette**: dark "Console Black" background (`#12100E`), elevated surfaces, brand beige (`#C0B89B`), phosphor accents (`#99ACFF` primary, `#33FF33` secondary), semantic states (`success`, `warning`, `danger`, `online`, `away`, `offline`).
- **Typography**: Inter font family loaded from Google Fonts; type scale from display (2.25rem) down to caption (0.75rem); matching line-heights.
- **Spacing**: 8pt grid (`--space-1` … `--space-7`).
- **Border radius**: tokenized per role (`sm`, `btn`, `input`, `card`, `image`, `full`).
- **Shadows**: elevation levels plus a glow variant tied to the accent color.
- **Transitions**: two easing curves (`ease-out`, `ease-spring`) and three durations (`fast`, `normal`, `slow`).
- **Layout**: fixed dimensions for sidebar widths, right panel width, topbar height, and minimum touch target (44px).

### App Shell Layout
The main layout is a CSS Grid `.app-shell` with three columns (sidebar / main / right-panel) and two rows (topbar / content), sized using `100dvh` so scrolling happens inside the main area rather than the viewport. Sidebars collapse via class toggles that swap CSS custom property values (`--_sidebar-w`, `--_right-w`), enabling JS-free column resizing with smooth transitions.

### Component Naming
Components use BEM-style class names (e.g., `.flag-modal-overlay`, `.flag-modal__header`, `.flag-modal__body`, `.flag-modal__footer`, `.topbar__brand`, `.topbar__search`). Modals expose visibility via `[aria-hidden="false"]` attribute selectors rather than dedicated state classes.

### Responsive Strategy
Mobile-first: base styles apply everywhere; larger screens get additional rules. The comment in `home.css` states "Mobile-first, responsive. Sidebars collapseable on desktop, overlay drawers on mobile." Breakpoints are used to switch between inline sidebars (desktop) and drawer overlays (mobile) controlled by `.drawer-overlay`.

### Typography & Theme
- Font: Inter (weights 400/500/600/700) loaded from Google Fonts.
- Global `color-scheme: dark` set on `html`.
- Gradient wordmark and logo backgrounds blend brand and accent colors.
- Scrollbars are themed via CSS custom properties (`--scrollbar-thumb`, `--scrollbar-track`).

### Build / Tooling
No CSS build step. No PostCSS, Sass, Less, or Tailwind. The `client/package.json` has no CSS-related dependencies — only ESLint, Playwright, http-server, serve, and Monocart for coverage. Styles are served as-is.

## Conventions & Constraints

- **All visual values go through CSS custom properties** defined in `client/styles/tokens.css`; raw hex colors and pixel spacings are avoided in component styles.
- **Cascade layers are mandatory**: every stylesheet starts with `@layer reset, base, tokens, components, utilities;` to enforce ordering.
- **Component classes follow BEM-like naming** (`block__element--modifier` pattern observed in modals and topbar).
- **Modals are driven by ARIA attributes** (`[aria-hidden="false"]`) for visibility state.
- **Touch targets are at least 44px** (`--touch-target`) per the token definition.
- **Fonts are loaded via Google Fonts `@import`** in each stylesheet that needs them (tokens and home.css both import Inter).
- **No CSS preprocessing or framework**: plain CSS only, no SCSS/Sass/Tailwind/PostCSS configuration exists in the repo.