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

All endpoints require authentication (Valid Session or Token) and expect `multipart/form-data`. They all proxy the request to the corresponding `/api/v1/*` endpoint on the AI Engine.

### 1. `POST /api/ai/sam-extract`
Evaluates shapes using SAM (Segment Anything Model) extraction.
- **Request Body:**
  - `image` (file, required): The image captured by the user.
  - `target_mask` (file, required): The mask identifying the target shape.
- **Response:** JSON payload from the AI service containing score and validation status.

### 2. `POST /api/ai/hsv-match`
Evaluates color matching using HSV (Hue, Saturation, Value) histograms.
- **Request Body:**
  - `image` (file, required): The captured image.
  - `reference_image` (file, required): The image to compare colors against.
- **Response:** JSON payload from the AI service containing score and validation status.

### 3. `POST /api/ai/texture-match`
Evaluates texture similarities.
- **Request Body:**
  - `image` (file, required): The captured image.
  - `reference_image` (file, required): The texture reference image.
- **Response:** JSON payload from the AI service containing score and validation status.

### 4. `POST /api/ai/sift-match`
Evaluates structural features using SIFT (Scale-Invariant Feature Transform).
- **Request Body:**
  - `image` (file, required): The captured image.
  - `archival_image` (file, required): The historical or archival image to match structural features.
- **Response:** JSON payload from the AI service containing score and validation status.

### 5. `POST /api/ai/symmetry`
Evaluates the geometric symmetry of the captured subject.
- **Request Body:**
  - `image` (file, required): The captured image.
- **Response:** JSON payload from the AI service containing score and validation status.

## Error Handling

**Response (400 Bad Request):**
```json
{
  "error": "Missing required files: [file_names]"
}
```

**Response (500 Internal Server Error):**
```json
{
  "error": "Failed to process [type] evaluation"
}
```

## Security & Reliability

- **File Limits:** The `multer` configuration limits incoming images to 50MB to prevent memory exhaustion on the Node.js server.
- **Timeouts:** The proxy request to the FastAPI service includes a timeout to prevent hanging connections if the model takes too long to infer.
- **Fail-open/closed:** If the AI Engine is completely down, the system gracefully informs the client via a 502 status, allowing them to try again later without crashing the main API.
