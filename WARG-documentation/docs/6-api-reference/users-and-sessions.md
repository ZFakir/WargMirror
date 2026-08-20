---
sidebar_position: 3
---

# Users & Sessions API

Endpoints under `/api/users` and `/api/sessions` handle social graphs, library tracking, and active gameplay session initialization.

## User Endpoints (`/api/users`)

### 1. `GET /api/users/:id`

Retrieves the public profile of a user, including their badges and trust score. Used by `user-profile.html` and `friend-profile.html`.

**Requirements**: Valid Session Cookie

**Response (200 OK):**
```json
{
  "user_id": 42,
  "username": "PlayerOne",
  "trust_score": 95,
  "badges": ["Beta Tester", "First Blood"]
}
```

### 2. `GET /api/users/:id/library`

Retrieves the ARGs that the user has either completed or bookmarked.

**Requirements**: Valid Session Cookie (must match `:id` unless public).

### 3. `GET /api/users/:id/friends`

Retrieves the social graph for the user (followers and following).

**Requirements**: Valid Session Cookie

---

## Session Endpoints (`/api/sessions`)

These endpoints manage the ephemeral state of a player actively playing an ARG.

### 1. `POST /api/sessions/start`

Initializes a new gameplay session for an ARG. Used by `game.html` when a user presses "Start".

**Requirements**: Valid Session Cookie

**Request Body:**
```json
{
  "arg_id": 101
}
```

**Response (200 OK):**
```json
{
  "session_id": 992,
  "status": "active",
  "start_time": "2026-08-20T10:00:00Z"
}
```

### 2. `GET /api/sessions/:user_id`

Retrieves all active sessions for a given user. This is used on `home.html` to allow players to resume games they abandoned or closed.

**Requirements**: Valid Session Cookie (must match `:user_id`).
