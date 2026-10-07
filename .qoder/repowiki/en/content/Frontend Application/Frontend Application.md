# Frontend Application

<cite>
**Referenced Files in This Document**
- [index.html](file://client/index.html)
- [config.js](file://client/scripts/config.js)
- [api.js](file://client/scripts/api.js)
- [sw.js](file://client/sw.js)
- [home.js](file://client/scripts/home.js)
- [game.js](file://client/scripts/game.js)
- [admin.js](file://client/scripts/admin.js)
- [studio.js](file://client/scripts/studio.js)
- [user-profile.js](file://client/scripts/user-profile.js)
- [sensors.js](file://client/scripts/sensors.js)
- [GameCard.js](file://client/scripts/components/GameCard.js)
- [MapModal.js](file://client/scripts/components/MapModal.js)
- [PlayModal.js](file://client/scripts/components/PlayModal.js)
- [CameraCapture.js](file://client/scripts/components/CameraCapture.js)
- [tokens.css](file://client/styles/tokens.css)
- [home.css](file://client/styles/home.css)
- [game.css](file://client/styles/game.css)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the WARG Platform’s static frontend: a multi-page, vanilla JavaScript application with modular components, a shared API client, and offline resilience via service workers. It covers the game interface, studio tools, admin panels, user profiles, Leaflet.js map integration, real-time sensor data collection, VJB Design System tokens, responsive CSS architecture, accessibility practices, and performance techniques for mobile-first gameplay.

## Project Structure
The frontend is organized as a set of HTML pages under client/, each paired with page-specific scripts and styles. Shared logic lives in scripts/ (API client, configuration, sensors, reusable components), and styles are layered using CSS cascade layers with design tokens.

```mermaid
graph TB
subgraph "Pages"
I["index.html"]
H["home.html"]
G["game.html"]
A["admin.html"]
S["studio.html"]
U["user-profile.html"]
end
subgraph "Shared Scripts"
C["scripts/config.js"]
AP["scripts/api.js"]
SE["scripts/sensors.js"]
end
subgraph "Components"
GC["components/GameCard.js"]
MM["components/MapModal.js"]
PM["components/PlayModal.js"]
CC["components/CameraCapture.js"]
end
subgraph "Styles"
TK["styles/tokens.css"]
HC["styles/home.css"]
GCSS["styles/game.css"]
end
subgraph "Offline"
SW["sw.js"]
end
I --> C
H --> AP
G --> AP
A --> AP
S --> AP
U --> AP
H --> GC
G --> MM
G --> PM
G --> CC
G --> SE
GC --> TK
MM --> TK
PM --> TK
CC --> TK
C --> SW
AP --> SW
```

**Diagram sources**
- [index.html:1-17](file://client/index.html#L1-L17)
- [config.js:1-30](file://client/scripts/config.js#L1-L30)
- [api.js:1-401](file://client/scripts/api.js#L1-L401)
- [sw.js:1-235](file://client/sw.js#L1-L235)
- [home.js:1-755](file://client/scripts/home.js#L1-L755)
- [game.js:1-838](file://client/scripts/game.js#L1-L838)
- [admin.js:1-272](file://client/scripts/admin.js#L1-L272)
- [studio.js:1-86](file://client/scripts/studio.js#L1-L86)
- [user-profile.js:1-126](file://client/scripts/user-profile.js#L1-L126)
- [sensors.js:1-59](file://client/scripts/sensors.js#L1-L59)
- [GameCard.js:1-533](file://client/scripts/components/GameCard.js#L1-L533)
- [MapModal.js:1-1032](file://client/scripts/components/MapModal.js#L1-L1032)
- [PlayModal.js:1-163](file://client/scripts/components/PlayModal.js#L1-L163)
- [CameraCapture.js:1-112](file://client/scripts/components/CameraCapture.js#L1-L112)
- [tokens.css:1-116](file://client/styles/tokens.css#L1-L116)
- [home.css:1-800](file://client/styles/home.css#L1-L800)
- [game.css:1-808](file://client/styles/game.css#L1-L808)

**Section sources**
- [index.html:1-17](file://client/index.html#L1-L17)
- [config.js:1-30](file://client/scripts/config.js#L1-L30)

## Core Components
- GameCard: Reusable card factory for ARG listings with actions (like/dislike/flag/publish/unpublish), progress visualization, and keyboard accessibility.
- MapModal: Leaflet-based map modal supporting player view and editor mode; manages markers, edges, bubble mask, and fullscreen behavior.
- PlayModal: Modal container for waypoint briefs and minigame controls; supports dynamic control injection and feedback overlays.
- CameraCapture: Camera stream manager for CV minigames with reference overlay and snapshot capture.
- Sensors: Client-side anti-spoofing data collector (accelerometer steps and geolocation buffer).

Key responsibilities and interactions:
- Home page uses GameCard to render rows (recent, new, creators) and integrates friend search and requests.
- Game page orchestrates MapModal, PlayModal, CameraCapture, and Sensors to run waypoints and minigames.
- Admin and Studio pages use GameCard and API helpers for content management.
- User Profile page displays stats, badges, and library.

**Section sources**
- [GameCard.js:1-533](file://client/scripts/components/GameCard.js#L1-L533)
- [MapModal.js:1-1032](file://client/scripts/components/MapModal.js#L1-L1032)
- [PlayModal.js:1-163](file://client/scripts/components/PlayModal.js#L1-L163)
- [CameraCapture.js:1-112](file://client/scripts/components/CameraCapture.js#L1-L112)
- [sensors.js:1-59](file://client/scripts/sensors.js#L1-L59)
- [home.js:1-755](file://client/scripts/home.js#L1-L755)
- [game.js:1-838](file://client/scripts/game.js#L1-L838)
- [admin.js:1-272](file://client/scripts/admin.js#L1-L272)
- [studio.js:1-86](file://client/scripts/studio.js#L1-L86)
- [user-profile.js:1-126](file://client/scripts/user-profile.js#L1-L126)

## Architecture Overview
The frontend follows a multi-page SPA-like architecture without a framework:
- Entry point redirects to login and loads config/service worker registration.
- Page scripts initialize UI, fetch data via api.js, and render components.
- The API client normalizes backend responses into a consistent shape used by components.
- Offline resilience is provided by sw.js with network-first, stale-while-revalidate, and cache-first strategies, plus background sync for minigame attempts.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Config as "config.js"
participant SW as "sw.js"
participant API as "api.js"
participant Page as "Page Script"
participant Backend as "Backend API"
Browser->>Config : Load config & register Service Worker
Config-->>SW : navigator.serviceWorker.register('sw.js')
Browser->>Page : Initialize page script
Page->>API : getCurrentUser() / getArgs() / getUserLibrary()
API->>Backend : HTTP GET/POST with credentials
Backend-->>API : JSON response
API-->>Page : Normalized data
Page->>Page : Render GameCard / MapModal / PlayModal
Note over SW,Browser : Network-first / SWR / Cache-first per route
```

**Diagram sources**
- [config.js:1-30](file://client/scripts/config.js#L1-L30)
- [sw.js:1-235](file://client/sw.js#L1-L235)
- [api.js:1-401](file://client/scripts/api.js#L1-L401)
- [home.js:1-755](file://client/scripts/home.js#L1-L755)
- [game.js:1-838](file://client/scripts/game.js#L1-L838)

## Detailed Component Analysis

### Vanilla JavaScript Architecture and State Management
- Global configuration sets API base URL and registers the service worker.
- api.js provides typed helpers for all endpoints and normalizes Arg objects to a GameCard-compatible format.
- Page scripts manage local state (e.g., current user, active sessions, friends list) and update DOM imperatively.
- LocalStorage is used for optimistic votes and dismissed items; BroadcastChannel coordinates offline sync results across tabs.

```mermaid
flowchart TD
Start(["App Boot"]) --> Config["Load config.js<br/>Set API_BASE_URL<br/>Register SW"]
Config --> InitPage["Initialize Page Script"]
InitPage --> AuthCheck["api.getCurrentUser()"]
AuthCheck --> |Guest| GuestFlow["Render guest prompts"]
AuthCheck --> |Authenticated| DataFetch["Parallel fetches:<br/>getArgs(), getFriends(), getActiveSessions()"]
DataFetch --> Normalize["Normalize data via api.normaliseArg()"]
Normalize --> Render["Render GameCard rows"]
Render --> Interact["User interactions (like/dislike/flag/publish)"]
Interact --> LocalState["Update localStorage optimistically"]
Interact --> APIWrite["api.voteArg()/api.sendFriendRequest()..."]
APIWrite --> Sync["Background Sync (minigame attempts)"]
```

**Diagram sources**
- [config.js:1-30](file://client/scripts/config.js#L1-L30)
- [api.js:1-401](file://client/scripts/api.js#L1-L401)
- [home.js:1-755](file://client/scripts/home.js#L1-L755)
- [sw.js:150-235](file://client/sw.js#L150-L235)

**Section sources**
- [config.js:1-30](file://client/scripts/config.js#L1-L30)
- [api.js:1-401](file://client/scripts/api.js#L1-L401)
- [home.js:1-755](file://client/scripts/home.js#L1-L755)

### Game Interface (game.html)
- Loads game state, initializes MapModal with nodes and edges, and watches geolocation.
- Prefetches minigame references for offline availability.
- Handles voting, flagging, comments, and minigame flows (GPS proximity or CV camera tasks).
- Integrates sensors for anti-spoofing and updates map player location.

```mermaid
sequenceDiagram
participant GameJS as "game.js"
participant MapModal as "MapModal.js"
participant PlayModal as "PlayModal.js"
participant Camera as "CameraCapture.js"
participant API as "api.js"
participant SW as "sw.js"
GameJS->>GameJS : loadGameStateAndInitMap()
GameJS->>MapModal : init(nodes, edges)
GameJS->>GameJS : watchPosition()
GameJS->>API : getMinigameReference(gameId)
Note over GameJS,SW : Prefetch for offline caching
GameJS->>PlayModal : open(node)
alt CV Minigame
GameJS->>Camera : start()
Camera-->>GameJS : onScoreUpdate(score)
GameJS->>API : submitMinigameAttempt(gameId, blob)
API-->>SW : Save offline + Background Sync
SW-->>GameJS : BroadcastChannel SYNC_RESULT
else GPS Proximity
GameJS->>API : arrive/submit
API-->>GameJS : outcome, unlockedNodes
GameJS->>MapModal : updateNodeStatus()
end
```

**Diagram sources**
- [game.js:1-838](file://client/scripts/game.js#L1-L838)
- [MapModal.js:1-1032](file://client/scripts/components/MapModal.js#L1-L1032)
- [PlayModal.js:1-163](file://client/scripts/components/PlayModal.js#L1-L163)
- [CameraCapture.js:1-112](file://client/scripts/components/CameraCapture.js#L1-L112)
- [api.js:211-310](file://client/scripts/api.js#L211-L310)
- [sw.js:150-235](file://client/sw.js#L150-L235)

**Section sources**
- [game.js:1-838](file://client/scripts/game.js#L1-L838)

### Studio Tools (studio.html)
- Fetches authenticated user’s library and splits into published/unpublished rows.
- Uses GameCard to render publish/unpublish actions and navigates to create_warg.html from hero card.

```mermaid
flowchart TD
SStart(["Studio Load"]) --> Auth["api.getCurrentUser()"]
Auth --> |Guest| Prompt["Show login prompt"]
Auth --> Library["api.getUserLibrary(userId)"]
Library --> Split["Filter published vs unpublished"]
Split --> Render["GameCard.renderRow(...)"]
Render --> Actions["Publish/Unpublish events"]
Actions --> Modal["PublishModal.open(...)"]
```

**Diagram sources**
- [studio.js:1-86](file://client/scripts/studio.js#L1-L86)
- [GameCard.js:1-533](file://client/scripts/components/GameCard.js#L1-L533)

**Section sources**
- [studio.js:1-86](file://client/scripts/studio.js#L1-L86)

### Admin Panels (admin.html)
- Displays recent flags and flagged games, allows resolving flags and deleting games.
- Provides user search with ban/unban toggles.

```mermaid
flowchart TD
AStart(["Admin Load"]) --> Flags["GET /api/admin/flags"]
Flags --> RenderFlags["Render flags list"]
RenderFlags --> Review["Review Flag Modal"]
Review --> Resolve["PUT /api/admin/flags/:id/resolve"]
Review --> Delete["DELETE /api/admin/games/:id"]
AStart --> Users["GET /api/admin/users?search=..."]
Users --> BanToggle["PUT /api/admin/users/:id/ban"]
```

**Diagram sources**
- [admin.js:1-272](file://client/scripts/admin.js#L1-L272)

**Section sources**
- [admin.js:1-272](file://client/scripts/admin.js#L1-L272)

### User Profiles (user-profile.html)
- Populates profile avatar, role title, stats, badges, and library grid.
- Shows guest state with login prompt when not authenticated.

```mermaid
flowchart TD
PStart(["Profile Load"]) --> Me["api.getCurrentUser()"]
Me --> |Guest| GuestUI["Show guest placeholder"]
Me --> Profile["api.getUserProfile(userId)"]
Profile --> Stats["Render points, distance, badges"]
Profile --> Library["api.getUserLibrary(userId)"]
Library --> Cards["GameCard.renderRow(...)"]
```

**Diagram sources**
- [user-profile.js:1-126](file://client/scripts/user-profile.js#L1-L126)

**Section sources**
- [user-profile.js:1-126](file://client/scripts/user-profile.js#L1-L126)

### Leaflet.js Map Integration
- MapModal dynamically injects Leaflet CSS/JS and renders OpenStreetMap tiles.
- Supports player mode (markers, popups, field log) and editor mode (draggable nodes, edge drawing, SVG overlays).
- Implements a circular bubble mask around the campus area and tracks player location with accuracy circle.

```mermaid
classDiagram
class MapModal {
+init(options)
+initEditor(options)
+updatePlayerLocation(lat, lng, accuracy)
+addEditorNode(node)
+removeEditorNode(id)
+setSelectedNode(id)
+updateEditorEdges(edges, nodes)
+setTempEdge(fromId, lat, lng)
+clearTempEdge()
-_redrawEdgeSvg()
-_geodesicBounds(center, radiusMeters)
-_addCircularMask()
}
```

**Diagram sources**
- [MapModal.js:1-1032](file://client/scripts/components/MapModal.js#L1-L1032)

**Section sources**
- [MapModal.js:1-1032](file://client/scripts/components/MapModal.js#L1-L1032)

### Real-Time WebSocket Communication
- No WebSocket usage was found in the analyzed frontend files. Real-time updates rely on polling APIs and BroadcastChannel for cross-tab sync of offline results.

[No sources needed since this section does not analyze specific files]

### Offline Resilience with Service Workers
- sw.js defines install/activate lifecycle, caches static assets, and applies routing strategies:
  - Network-first for sensitive routes (/auth/me, /api/sessions, etc.)
  - Stale-while-revalidate for catalogue/minigames/library
  - Cache-first for static assets and map tiles
- Background Sync queues minigame attempts and retries them when online, notifying clients via BroadcastChannel.

```mermaid
flowchart TD
Install["Install"] --> CacheAssets["Cache static assets"]
Activate["Activate"] --> Claim["Claim clients"]
Fetch["Fetch"] --> Route{"Route type?"}
Route --> |Sensitive| NetFirst["Network First"]
Route --> |Catalogue/Minigames| SWR["Stale-While-Revalidate"]
Route --> |Static/Tiles| CacheFirst["Cache First"]
NetFirst --> Response["Return response or cached fallback"]
SWR --> Response
CacheFirst --> Response
Sync["Background Sync"] --> Queue["Get pending attempts"]
Queue --> Submit["POST attempt to server"]
Submit --> Notify["BroadcastChannel SYNC_RESULT"]
```

**Diagram sources**
- [sw.js:1-235](file://client/sw.js#L1-L235)

**Section sources**
- [sw.js:1-235](file://client/sw.js#L1-L235)

### VJB Design System Implementation
- tokens.css defines color palette, typography, spacing, radii, shadows, transitions, and layout variables.
- All pages and components consume these tokens for consistent dark theme and brand accents.

```mermaid
graph LR
Tokens["tokens.css<br/>Design Tokens"] --> HomeCSS["home.css"]
Tokens --> GameCSS["game.css"]
Tokens --> Components["Components (GameCard, MapModal, PlayModal)"]
```

**Diagram sources**
- [tokens.css:1-116](file://client/styles/tokens.css#L1-L116)
- [home.css:1-800](file://client/styles/home.css#L1-L800)
- [game.css:1-808](file://client/styles/game.css#L1-L808)

**Section sources**
- [tokens.css:1-116](file://client/styles/tokens.css#L1-L116)

### Responsive CSS Architecture and Accessibility
- home.css implements a mobile-first app shell with collapsible sidebars and drawer overlays on small screens.
- Touch targets sized to 44px, focus-visible outlines, aria attributes on interactive elements, and semantic roles.
- game.css adapts modals to bottom sheets on mobile and ensures map visibility during modal open states.

**Section sources**
- [home.css:1-800](file://client/styles/home.css#L1-L800)
- [game.css:1-808](file://client/styles/game.css#L1-L808)

## Dependency Analysis
```mermaid
graph TB
AP["api.js"] --> BE["Backend Endpoints"]
HOME["home.js"] --> AP
GAME["game.js"] --> AP
ADMIN["admin.js"] --> AP
STUDIO["studio.js"] --> AP
PROFILE["user-profile.js"] --> AP
GAME --> MM["MapModal.js"]
GAME --> PM["PlayModal.js"]
GAME --> CC["CameraCapture.js"]
GAME --> SE["sensors.js"]
HOME --> GC["GameCard.js"]
STUDIO --> GC
ADMIN --> GC
SW["sw.js"] --> CACHE["Cache API"]
SW --> SYNC["Background Sync"]
```

**Diagram sources**
- [api.js:1-401](file://client/scripts/api.js#L1-L401)
- [home.js:1-755](file://client/scripts/home.js#L1-L755)
- [game.js:1-838](file://client/scripts/game.js#L1-L838)
- [admin.js:1-272](file://client/scripts/admin.js#L1-L272)
- [studio.js:1-86](file://client/scripts/studio.js#L1-L86)
- [user-profile.js:1-126](file://client/scripts/user-profile.js#L1-L126)
- [MapModal.js:1-1032](file://client/scripts/components/MapModal.js#L1-L1032)
- [PlayModal.js:1-163](file://client/scripts/components/PlayModal.js#L1-L163)
- [CameraCapture.js:1-112](file://client/scripts/components/CameraCapture.js#L1-L112)
- [sensors.js:1-59](file://client/scripts/sensors.js#L1-L59)
- [GameCard.js:1-533](file://client/scripts/components/GameCard.js#L1-L533)
- [sw.js:1-235](file://client/sw.js#L1-L235)

**Section sources**
- [api.js:1-401](file://client/scripts/api.js#L1-L401)
- [sw.js:1-235](file://client/sw.js#L1-L235)

## Performance Considerations
- Lazy loading of Leaflet JS/CSS only when MapModal is initialized.
- Skeleton loaders for cards and lists to improve perceived performance.
- Optimistic UI updates for likes/dislikes persisted locally until server confirmation.
- Prefetching minigame references for offline play.
- Using BroadcastChannel to avoid re-fetching after offline sync.
- Debounced friend search input to reduce API calls.
- Efficient DOM rendering via DocumentFragment in GameCard.renderRow.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Camera permission denied: CameraCapture throws an error if getUserMedia fails; ensure HTTPS and grant camera permissions.
- Offline submission failures: Check Background Sync and BroadcastChannel messages; verify service worker registration and cache names.
- Vote counts mismatch: Clear local votes key or reconcile with server response; check localStorage integrity.
- Map not rendering: Ensure Leaflet loaded and container has dimensions; call invalidateSize after layout settles.
- Admin actions failing: Confirm credentials and role; verify endpoint paths and status codes.

**Section sources**
- [CameraCapture.js:37-53](file://client/scripts/components/CameraCapture.js#L37-L53)
- [sw.js:150-235](file://client/sw.js#L150-L235)
- [game.js:277-344](file://client/scripts/game.js#L277-L344)
- [MapModal.js:138-184](file://client/scripts/components/MapModal.js#L138-L184)
- [admin.js:118-169](file://client/scripts/admin.js#L118-L169)

## Conclusion
The WARG Platform frontend combines a simple, maintainable vanilla JavaScript architecture with robust componentization, a centralized API client, and comprehensive offline support. The VJB Design System ensures visual consistency, while responsive CSS and accessibility features deliver a polished mobile-first experience. Leaflet maps, sensor data, and background sync enable engaging geospatial gameplay even under connectivity constraints.