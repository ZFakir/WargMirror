---
sidebar_position: 2
---

# System Flows

The interactions between the static Multi-Page Application (MPA) frontend and the Express REST API can be complex. Below are the key system flows visualized.

## 1. Starting an ARG (Gameplay Flow)

When a player selects an ARG from the catalogue and clicks "Start", the system must initialize a session and retrieve the initial state.

```mermaid
sequenceDiagram
    participant Player
    participant GameView (game.html)
    participant API (Render)
    participant Database (Aiven)
    
    Player->>GameView: Clicks "Start ARG" (ID: 101)
    GameView->>API: POST /api/sessions/start { arg_id: 101 }
    API->>Database: INSERT INTO game_sessions
    Database-->>API: Session Created
    API-->>GameView: 200 OK (Session Data)
    
    GameView->>API: GET /api/args/101
    API->>Database: Query Waypoints & Edges
    Database-->>API: ARG Graph
    API-->>GameView: 200 OK (ARG JSON)
    
    GameView->>Player: Requests Geolocation Permission
    Player->>GameView: Grants Permission
    GameView->>GameView: Renders Leaflet Map & GPS Tracking
```

## 2. Creator Studio: Plotting a Waypoint

When a creator clicks on the map in `edit_warg.html` to add a new physical location for a challenge.

```mermaid
sequenceDiagram
    participant Creator
    participant EditView (edit_warg.html)
    participant API (Render)
    
    Creator->>EditView: Clicks on Leaflet Map
    EditView->>EditView: Generates temporary UI Marker
    Creator->>EditView: Attaches Minigame (e.g., "Scan QR Code")
    Creator->>EditView: Clicks "Save Waypoint"
    
    EditView->>API: POST /api/args/101/waypoints
    Note right of EditView: Payload includes GeoJSON<br>Point & Minigame config
    API->>API: Validate SRID 4326 Bounds
    API-->>EditView: 201 Created (Waypoint ID: 501)
    
    EditView->>EditView: Updates Map Marker State (Saved)
```

## 3. Session Validation

Because the frontend is entirely static, it must verify the user's authentication status dynamically on every authenticated page load using a shared `auth.js` utility.

```mermaid
sequenceDiagram
    participant Browser
    participant auth.js
    participant API (Render)
    
    Browser->>auth.js: window.onload()
    auth.js->>API: GET /api/auth/me (with connect.sid Cookie)
    
    alt Session Valid
        API-->>auth.js: 200 OK (User Profile)
        auth.js->>Browser: Update Navbar (Avatar, Logout Button)
    else Session Invalid or Missing
        API-->>auth.js: 401 Unauthorized
        auth.js->>Browser: window.location.href = '/login.html'
    end
```
