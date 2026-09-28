---
sidebar_position: 9
---

# AI Engine Subsystem

The AI Engine subsystem bridges the core Node.js/Express backend with the Python-based AI Engine (FastAPI) microservice. This microservice powers the computer vision grading for minigames, ensuring loose coupling and scalable model inference.

## Overview

When a user submits an image for a minigame, the request goes through the following flow:
1. **Node.js Express API**: Receives the image (via `multer`) and the `minigame_id`.
2. **AI Engine Service**: The Node backend proxies this image as a multi-part form payload to the Python AI Engine at `POST /ai/evaluate`.
3. **Evaluation**: The Python engine evaluates the image against the criteria for the minigame (e.g., detecting specific objects, reading text).
4. **Response**: The engine responds with an analysis payload, including a score (`confidence`) and a boolean `passed` flag.
5. **Database Update**: The Node API updates the `MinigameAttempt` and updates the `WaypointProgress` accordingly.

## Endpoints

### 1. `POST /api/ai/evaluate`

Evaluates an image for a specific minigame.

**Authentication:** Required (Valid Session or Token)
**Content-Type:** `multipart/form-data`

**Request Body:**
- `minigame_id` (integer, required): The ID of the minigame being attempted.
- `image` (file, required): The image captured by the user's camera (limit 50MB).

**Response (200 OK):**
```json
{
  "success": true,
  "passed": true,
  "score": 92.5,
  "feedback": "Object recognized successfully.",
  "attempt_id": 1045
}
```

**Response (400 Bad Request):**
```json
{
  "error": "No image provided"
}
```

**Response (502 Bad Gateway):**
```json
{
  "error": "AI Engine is unreachable or returned an error."
}
```

## Security & Reliability

- **File Limits:** The `multer` configuration limits incoming images to 50MB to prevent memory exhaustion on the Node.js server.
- **Timeouts:** The proxy request to the FastAPI service includes a timeout to prevent hanging connections if the model takes too long to infer.
- **Fail-open/closed:** If the AI Engine is completely down, the system gracefully informs the client via a 502 status, allowing them to try again later without crashing the main API.
