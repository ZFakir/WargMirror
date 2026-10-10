# IP-P1-3 — Deploy and Make the Documentation Site Discoverable

**Register item:** MISSING_ITEMS.md §3, P1-3
**Prerequisites:** none (can run in parallel with IP-00; only the final README link step benefits from knowing the URL is stable).
**Coordinates with:** IP-P1-2b (README/docs links), IP-P3-13 (final docs completeness).
**Effort:** 1–2 hours plus deployment-access wait.

## 1. What is missing and why it matters for scoring

The brief requires a publicly hosted static documentation site. At assessment time `warg-docs/docusaurus.config.js` still pointed at the placeholder `https://your-docusaurus-site.example.com`, and no docs URL was discoverable from the README. A marker who cannot open the docs cannot credit documentation quality, API reference accuracy, testing evidence, or the AI-attribution declaration (IP-P1-2b) — so this single item gates several rubric lines.

## 2. Current state (verified)

- `warg-docs/docusaurus.config.js:29` — `url: 'https://your-docusaurus-site.example.com'`; `:32` `baseUrl: '/'`; `:36-37` `organizationName: 'facebook'`, `projectName: 'docusaurus'`; `:58-59` and `:70` — template `editUrl` pointing at the Docusaurus repo; `:39` `onBrokenLinks: 'throw'` (build fails on broken links, which is good).
- `warg-docs/wrangler.jsonc` — Cloudflare Workers static-assets config: name `warg-docs`, serves `./build`, `not_found_handling: '404-page'`. No deploy script references it yet.
- `warg-docs/package.json` — `build`/`deploy` scripts are stock Docusaurus (`docusaurus deploy` targets GitHub Pages, **not** Cloudflare); `engines: node >=20`.
- The repo contains **two** Docusaurus projects: `warg-docs/` (current, referenced by the register) and `WARG-documentation/` (older build). Only one can be canonical.
- `README.md` has no documentation-site link (deliberately withheld until the URL is real).

## 3. Implementation subtasks

1. **Confirm the canonical site and platform with the team.** Pick `warg-docs/` (register baseline; has Wrangler config) and record that `WARG-documentation/` is legacy — mark it as such or exclude it from submission narrative.
2. **Confirm the intended host and canonical hostname** (Cloudflare via the existing `wrangler.jsonc` is the path of least resistance). Do not guess a URL in source.
3. **Fix `warg-docs/docusaurus.config.js`:** set real `url` and `baseUrl`; correct `organizationName`/`projectName` to the team's Gitea/GitHub identity; point `editUrl` at the real repo path or remove it.
4. **Build:** `cd warg-docs; npm ci; npm run build` — must exit 0 (`onBrokenLinks: 'throw'` makes this a real check). Repair any broken absolute links or sidebar problems.
5. **Deploy** with the team-approved process: for Cloudflare, `npx wrangler deploy` against the `warg-docs` worker, with credentials configured outside source control (env vars/`wrangler login` on the operator's machine — never commit API tokens).
6. **Add a deploy convenience script** to `warg-docs/package.json`, e.g. `"deploy:cf": "npm run build && wrangler deploy"`.
7. **Link it:** add the canonical docs URL to `README.md` next to the app URL, and optionally in the client footer/menu.

## 4. Required checks

- `cd warg-docs; npm run build` exits 0.
- Deployed home page, API docs section, testing page, and the AI-attribution page (IP-P1-2b) all load over HTTPS without broken assets.
- Navigation works with the deployed `baseUrl` (if served under a path, spot-check sidebars, search, and sitemap).

## 5. Acceptance criteria

- The docs URL is real, set in `docusaurus.config.js`, reachable publicly, and linked from `README.md`.
- A marker can find architecture, API reference, testing evidence, deployment, and AI attribution within two clicks from the docs home page.
- Deployed content matches the current branch (not a stale manual upload).

## 6. Verification without breaking existing functionality

- Local: `npm run build` then `npm run serve` in `warg-docs` and click through every sidebar section.
- Live: `curl -s -o $null -w "%{http_code}" <docs-url>` (expect 200), plus a browser pass on the pages listed above.
- This item touches no runtime code path — the app and API are unaffected; rollback is reverting the config and redeploying.

## 7. Safety notes

- Never commit Cloudflare/Gitea tokens; Wrangler auth lives on the deployer's machine only.
- Deployments are static files — there is **no database involvement** in this item.
- Keep the deploy manual/operator-driven until after submission; adding CI auto-deploy is optional polish, not required for scoring.
