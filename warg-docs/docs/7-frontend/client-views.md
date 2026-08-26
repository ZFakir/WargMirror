---
sidebar_position: 1
---

# Client Views & Workflows

The WARG platform's frontend is intentionally designed as a static **Multi-Page Application (MPA)**. There is no React, Vue, or build step. It relies entirely on standard HTML files, raw CSS, and vanilla JavaScript using native DOM manipulation and the `fetch` API.

## File Structure

The `client/` directory contains 12 core `.html` files, each responsible for a distinct user context.

### Authentication
- `login.html`: Renders the OAuth Google login button. Captures redirect errors via URL parameters.
- `signup.html`: Optional secondary route for alternative signups (currently funnels to Google OAuth).

### Gameplay
- `home.html`: The primary player dashboard. Displays active sessions, recommended ARGs, and the user's current point total.
- `catalogue.html`: The main browsing interface to find published ARGs. Allows filtering by tags and modes.
- `game.html`: The core gameplay loop view. Leverages the Geolocation API to track the player's physical coordinates against active Waypoints. Renders AR and standard Minigames.

### Creation Studio
- `studio.html`: The creator dashboard. Lists drafts and published ARGs created by the user.
- `create_warg.html`: A wizard for instantiating a new ARG.
- `edit_warg.html`: A complex Leaflet.js-powered map interface where creators can plot Waypoints, draw Edges, and attach Minigames to nodes visually.

### Social & Admin
- `user-profile.html`: Displays the player's badges, Trust Score, and completed games.
- `friend-profile.html`: Read-only view for looking at a peer's profile.
- `admin.html`: Moderation dashboard for resolving user flags and viewing system metrics.
- `analytics.html`: Creator-specific dashboards showing play rates and drop-off points for their ARGs.

## Shared Resources

- **`/styles`**: Contains all CSS. `global.css` is injected into every page.
- **`/scripts`**: Contains page-specific logic (e.g., `game.js`, `studio.js`) as well as shared utilities like `auth.js` (for validating the session token).
- **`/assets`**: Static imagery, SVGs, and placeholder UI elements.

## Routing (Vercel)

Vercel serves these static files directly. A `vercel.json` file is included in the root of the `client/` directory to enable `cleanUrls: true`. This ensures that a user navigating to `/game` is correctly served `game.html` without needing the extension in the URL bar.
