---
sidebar_position: 2
---

# ARG API

The `/api/args` prefix manages the retrieval, creation, and interaction with ARGs (Alternate Reality Games).

## Endpoints

### 1. `GET /api/args`

Retrieves a paginated list of published ARGs. Used primarily by the `catalogue.html` and `home.html` views to display games to the user.

**Requirements**: None (Public)

**Query Parameters:**
- `page` (optional): Page number for pagination.
- `limit` (optional): Number of results per page.
- `mode` (optional): Filter by mode (`standard`, `live`, `point_domination`).

**Response (200 OK):**
```json
{
  "args": [
    {
      "arg_id": 101,
      "title": "The Cipher of Origins",
      "mode": "standard",
      "status": "published",
      "creator": {
        "username": "GameMaster"
      }
    }
  ],
  "total": 1
}
```

### 2. `GET /api/args/:id`

Retrieves the full details of a specific ARG, including its attached Waypoints, Edges, and Minigames. Used heavily by `game.html` and `edit_warg.html`.

**Requirements**: Valid Session Cookie (if private), None (if public).

**Response (200 OK):**
```json
{
  "arg_id": 101,
  "title": "The Cipher of Origins",
  "waypoints": [
    {
      "waypoint_id": 501,
      "location": { "type": "Point", "coordinates": [28.0305, -26.1929] },
      "minigame": {
        "game_type": "qrcode"
      }
    }
  ]
}
```

### 3. `POST /api/args`

Creates a new ARG. Used by the `create_warg.html` view.

**Requirements**: Valid Session Cookie

**Request Body:**
```json
{
  "title": "New Event",
  "mode": "live",
  "description": "A live PvP event."
}
```

### 4. `POST /api/args/:id/vote`

Submits an upvote or downvote for an ARG to influence its catalogue ranking.

**Requirements**: Valid Session Cookie

**Request Body:**
```json
{
  "vote": "up" // or "down"
}
```

### 5. `POST /api/args/:id/flag`

Submits a moderation flag against an ARG.

**Requirements**: Valid Session Cookie

**Request Body:**
```json
{
  "reason": "inappropriate_content"
}
```
