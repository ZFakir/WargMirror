---
sidebar_position: 3
---

# AI Engine Data Flow

The AI Engine processes computer vision and machine learning tasks (such as shape matching, color matching, and texture matching) for the WARG Platform. The data flow from the moment an author uploads a reference image to when a player uploads their solution is outlined below.

## Architecture & Data Flow

```mermaid
sequenceDiagram
    participant C as Creator (Studio)
    participant P as Player (Client)
    participant E as Node/Express API
    participant DB as MySQL Database
    participant AI as AI Engine (AWS Lightsail)

    %% Author flow
    Note over C, AI: Authorizing and Uploading a Reference Image
    C->>E: POST /api/wargs/waypoints (Upload reference image & settings)
    E->>AI: POST /extract-features (Send image for pre-processing)
    AI-->>E: Return extracted features (e.g., LBP histogram, ORB keypoints)
    E->>DB: Store waypoint data & AI reference features
    E-->>C: Confirm Waypoint Created

    %% Player flow
    Note over P, AI: Player Gameplay and Solution Validation
    P->>P: Reaches waypoint (Geofence validated)
    P->>P: Captures image / traces shape on canvas
    P->>E: POST /api/play/validate (Send player's capture/image)
    E->>DB: Fetch stored AI reference features for this waypoint
    DB-->>E: Return reference features
    E->>AI: POST /validate-solution (Send player image & reference features)
    AI->>AI: Process image & compute similarity (Jaccard, SSIM, etc.)
    AI-->>E: Return match score & pass/fail boolean
    
    alt Match Successful
        E->>DB: Update player progress
        E-->>P: Puzzle Solved!
    else Match Failed
        E-->>P: Incorrect, try again.
    end
```

## Description of the Flow

### 1. Author Upload
- **Studio Interface**: Creators upload images, logos, or patterns in the Studio dashboard.
- **Express Backend**: The backend receives the image and immediately proxies it to the AI Engine for pre-processing.
- **AI Engine**: Generates a set of reference features (such as local binary patterns for textures, keypoints for ORB/SIFT, or histograms for color-matching).
- **Storage**: Rather than storing raw images, the backend stores these lightweight extracted features in the database alongside the waypoint's geometry and metadata. This saves space and speeds up validation.

### 2. Player Validation
- **Client Capture**: While playing the ARG, the player's device captures an image or canvas drawing via the AR overlay.
- **Express Backend**: The client payload is sent to the backend. The backend queries the database to retrieve the *reference features* previously stored for the puzzle.
- **AI Engine Validation**: The backend forwards the player's new image and the stored reference features to the AI Engine. The AI Engine computes a distance metric (such as Jaccard Index for shapes, SSIM for symmetry, or Chi-squared distance for textures).
- **Resolution**: Based on a configurable threshold, the AI Engine returns a similarity score and a binary result (pass/fail). The backend then records the progress and notifies the client.
