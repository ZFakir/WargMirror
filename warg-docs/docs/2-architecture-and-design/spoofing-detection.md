---
sidebar_position: 4
---

# Spoofing Detection System

To preserve the integrity of the Wits Alternate Reality Game (WARG) platform, location and identity spoofing must be strictly mitigated. We implement a multi-tiered **Spoofing Detection System** combined with a **Trust Profile** mechanism.

## 1. Trust Profiles

Each user account is associated with a hidden "Trust Score".
- A high trust score implies the user is a legitimate, physically active player.
- A low trust score is a signal for admin review only — it never restricts the account by itself.

Points are incrementally awarded for passing continuous background checks and deducted when anomalies are detected. When an interaction fails a check, that single interaction is rejected and the score drops — but the player keeps full access to their account. **Account bans are never automatic**: only an admin can suspend an account (`is_suspended`), which blocks login and all authenticated API access.

## 2. Detection Mechanisms

### 2.1 Drift Detection
**Concept**: Genuine GPS signals inherently contain noise. A stationary device will display slight variations in coordinates over time (GPS drift).
**Implementation**:
- The client buffers coordinates captured via `navigator.geolocation.watchPosition()`.
- If a series of coordinates is completely identical (variance exactly zero) for a significant duration, the client is likely using software to emulate a static location.
- **Action**: The Express API lowers the Trust Score for the session and rejects interactions if drift variance falls below a realistic threshold.

### 2.2 Speed Detection (Distance over Time)
**Concept**: Players cannot travel across campus faster than physically possible.
**Implementation**:
- The server tracks the `timestamp` and `POINT` of the last verified interaction.
- Upon a new interaction, the server calculates the straight-line distance (`ST_Distance_Sphere` in MySQL) and divides it by the time elapsed.
- If the calculated speed exceeds the bounds of human running or standard vehicle speeds (e.g., > 40 km/h on footpaths), a flag is raised.
- **Action**: Immediate interaction rejection and significant Trust Score penalty.

### 2.3 Pedometer / Accelerometer Integration
**Concept**: Emulating GPS is easy; emulating the corresponding physics of walking is hard.
**Implementation**:
- We request access to the device's accelerometer (`DeviceMotionEvent`).
- The client counts steps or measures rhythmic motion associated with walking while moving between waypoints.
- The step count is submitted alongside the location data.
- The server validates whether the number of steps roughly matches the geographical distance covered.
- **Action**: If a player covers 500 meters but their device reports 0 steps or zero physical movement, it strongly indicates GPS spoofing (e.g., using a joystick app).

### 2.4 Altitude and IP Geolocation Checks (Future Considerations)
- Checking if the altitude provided by the GPS matches the expected campus topography.
- Correlating the IP address (e.g., Wits Campus Wi-Fi) with the GPS location. A player whose IP resolves to a foreign country while their GPS reports Wits Campus will be flagged.
