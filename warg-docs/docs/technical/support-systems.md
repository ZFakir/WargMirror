---
sidebar_position: 2
---

# Support & Auxiliary Systems

The platform's core gameplay loops rely on verifiable location data and several supporting subsystems.

## Geospatial Validation and Geofencing

### Waypoint Storage

MySQL contains spatial extensions which allow us to store ARG waypoints as a `POINT` geometry type, using SRID 4326 (WGS 84).

### Geofencing

When a user interacts with a waypoint, their device reports their GPS coordinates to the Express API. This is then queried against the waypoint's location in the database to determine whether it falls within a specified radius, using MySQL's `ST_Distance_Sphere` function.

### Frontend Integration

Tracking and rendering player and waypoint locations is handled using Leaflet maps, using the HTML5 `navigator.geolocation` API and the `watchPosition()` function to send queries to our Express endpoint.

### Anti-Spoofing and Trust Profiles

To combat spoofing, we employ several detection methods to compose trust profiles for our users:

- **Drift detection** — a lack of drift is an immediate flag, since spoofed locations tend to report the exact same coordinate repeatedly, whereas real locations have some degree of drift from noise and movement.
- **Pedometer integration** — requesting access to a player's pedometer lets us detect basic spoofing technology that fails to spoof accelerometer readings, flagging spoofed journeys by their lack of steps.
- **Speed detection** — a basic distance/time calculation flags players whose implied speed exceeds realistic expectations.

## Offline Resilience

To account for network dead-zones on campus, the client caches active puzzles (where the puzzle type supports offline play) using **Service Workers** to intercept network requests and **IndexedDB** to persist puzzle state. If a player loses signal, their puzzle attempts are held locally and validated by the server once connectivity is restored. Live or co-op games are not available offline.

## Social and Rating Subsystem

To moderate and evaluate minigames, the platform includes a rating subsystem for flagging content, supported by an interactive commenting system for players to discuss and give feedback. A rudimentary friends-system allows players to participate in co-op ARGs and track each other's progress.
