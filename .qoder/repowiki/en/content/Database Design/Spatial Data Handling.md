# Spatial Data Handling

<cite>
**Referenced Files in This Document**   
- [schema.sql](file://database/schema.sql)
- [LocationEvent.js](file://server/src/models/LocationEvent.js)
- [Waypoint.js](file://server/src/models/Waypoint.js)
- [gameController.js](file://server/src/controllers/gameController.js)
- [antiSpoofing.js](file://server/src/middleware/antiSpoofing.js)
- [test_loc.js](file://server/test_loc.js)
- [spoofing-detection.md](file://warg-docs/docs/2-architecture-and-design/spoofing-detection.md)
- [schema.md](file://warg-docs/docs/3-database/schema.md)
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
This document explains how the WARG Platform stores and queries spatial data using MySQL’s geospatial extensions. The system uses MySQL POINT geometry with SRID 4326 (WGS 84) to represent real-world coordinates for waypoints and GPS tracking events. It also documents spatial indexing strategies, proximity checks, geofencing, anti-spoofing mechanisms, and performance tuning techniques for large-scale location data.

## Project Structure
The spatial data handling spans database schema definitions, Sequelize models, controllers performing SQL-based spatial operations, and middleware implementing anti-spoofing logic.

```mermaid
graph TB
subgraph "Database"
SCHEMA["MySQL Schema<br/>SRID 4326 / WGS 84"]
WAYPOINTS["waypoints.location: POINT SRID 4326"]
LOC_EVENTS["location_events.location: POINT SRID 4326"]
end
subgraph "Server"
MODEL_WP["Waypoint Model<br/>GEOMETRY('POINT', 4326)"]
MODEL_LE["LocationEvent Model<br/>GEOMETRY('POINT', 4326)"]
CTRL_GAME["Game Controller<br/>ST_Distance_Sphere()"]
MW_AS["Anti-Spoofing Middleware<br/>Haversine + Trust Profile"]
end
SCHEMA --> WAYPOINTS
SCHEMA --> LOC_EVENTS
MODEL_WP --> CTRL_GAME
MODEL_LE --> CTRL_GAME
MODEL_LE --> MW_AS
CTRL_GAME --> SCHEMA
MW_AS --> SCHEMA
```

**Diagram sources**
- [schema.sql:160-179](file://database/schema.sql#L160-L179)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)
- [Waypoint.js:4-17](file://server/src/models/Waypoint.js#L4-L17)
- [LocationEvent.js:4-18](file://server/src/models/LocationEvent.js#L4-L18)
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)

**Section sources**
- [schema.sql:1-10](file://database/schema.sql#L1-L10)
- [schema.md:1-10](file://warg-docs/docs/3-database/schema.md#L1-L10)

## Core Components
- Waypoints store ARG locations as POINT geometry with SRID 4326 and include a validation radius for proximity checks.
- Location events record high-frequency GPS breadcrumbs with optional accuracy, speed, heading, and suspicious flags.
- Controllers use MySQL spatial functions to compute distances and validate geofences.
- Anti-spoofing middleware evaluates drift anomalies, impossible speeds, and pedometer mismatches, updating user trust profiles.

Key responsibilities:
- Store and index spatial data efficiently.
- Validate player proximity to waypoints.
- Detect spoofed or unrealistic movement patterns.
- Maintain a trust profile per user based on behavioral signals.

**Section sources**
- [schema.sql:160-179](file://database/schema.sql#L160-L179)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)

## Architecture Overview
The spatial workflow integrates client GPS inputs, server-side validation, and MySQL spatial queries.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant API as "Express API"
participant Ctrl as "Game Controller"
participant DB as "MySQL (SRID 4326)"
participant MW as "Anti-Spoofing Middleware"
Client->>API : POST /arrive/{waypointId} {lat, lng, accuracy_m}
API->>MW : Run anti-spoofing checks
MW->>DB : Read last LocationEvent
MW-->>API : Suspicious? Flags?
API->>Ctrl : arriveAtWaypoint(lat, lng)
Ctrl->>DB : ST_GeomFromText(POINT(lat lng), 4326)
Ctrl->>DB : ST_Distance_Sphere(location, point)
DB-->>Ctrl : distance meters
Ctrl->>DB : INSERT location_events
Ctrl-->>Client : {within_radius, distance, radius}
```

**Diagram sources**
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)

## Detailed Component Analysis

### Database Schema: Spatial Tables
- waypoints.location is a POINT with SRID 4326 and includes a SPATIAL INDEX for efficient proximity queries.
- location_events.location is a POINT with SRID 4326 and includes a SPATIAL INDEX for fast spatial scans.
- Both tables are InnoDB with utf8mb4 collation and enforce foreign keys where applicable.

```mermaid
erDiagram
WAYPOINTS {
int waypoint_id PK
int arg_id FK
string title
text description
point location
smallint validation_radius_m
datetime created_at
datetime updated_at
}
LOCATION_EVENTS {
bigint event_id PK
int user_id FK
point location
float accuracy_m
float speed_ms
float heading
datetime recorded_at
tinyint is_suspicious
json flags_json
}
USERS {
int user_id PK
decimal trust_score
tinyint is_flagged
int distance_walked_m
}
TRUST_EVENTS {
int event_id PK
int user_id FK
string event_type
decimal delta_score
json context_json
datetime recorded_at
}
USERS ||--o{ LOCATION_EVENTS : "has many"
USERS ||--o{ TRUST_EVENTS : "generates"
```

**Diagram sources**
- [schema.sql:160-179](file://database/schema.sql#L160-L179)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)
- [schema.sql:376-390](file://database/schema.sql#L376-L390)
- [schema.sql:15-44](file://database/schema.sql#L15-L44)

**Section sources**
- [schema.sql:160-179](file://database/schema.sql#L160-L179)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)
- [schema.sql:376-390](file://database/schema.sql#L376-L390)

### Sequelize Models: Geometric Types
- Waypoint model defines location as GEOMETRY('POINT', 4326).
- LocationEvent model defines location as GEOMETRY('POINT', 4326) and indexes user_id and recorded_at for time-series queries.

```mermaid
classDiagram
class Waypoint {
+int waypoint_id
+int arg_id
+string title
+text description
+geometry location
+smallint validation_radius_m
+datetime created_at
+datetime updated_at
}
class LocationEvent {
+bigint event_id
+int user_id
+geometry location
+float accuracy_m
+float speed_ms
+float heading
+datetime recorded_at
+boolean is_suspicious
+json flags_json
}
Waypoint --> LocationEvent : "proximity validated by controller"
```

**Diagram sources**
- [Waypoint.js:4-17](file://server/src/models/Waypoint.js#L4-L17)
- [LocationEvent.js:4-18](file://server/src/models/LocationEvent.js#L4-L18)

**Section sources**
- [Waypoint.js:4-17](file://server/src/models/Waypoint.js#L4-L17)
- [LocationEvent.js:4-18](file://server/src/models/LocationEvent.js#L4-L18)

### Geofencing and Proximity Queries
The controller validates whether a player is within a waypoint’s validation radius using MySQL’s ST_Distance_Sphere function. It logs each arrival attempt into location_events and returns proximity results.

```mermaid
flowchart TD
Start(["Arrive at Waypoint"]) --> ValidateInput["Validate lat/lng"]
ValidateInput --> FetchWaypoint["Fetch Waypoint by ID"]
FetchWaypoint --> LogEvent["Log LocationEvent<br/>ST_GeomFromText(POINT(lat lng), 4326)"]
LogEvent --> ComputeDistance["Compute Distance<br/>ST_Distance_Sphere(location, point)"]
ComputeDistance --> CompareRadius{"distance <= validation_radius_m?"}
CompareRadius --> |Yes| Within["Return within_radius = true"]
CompareRadius --> |No| Outside["Return within_radius = false"]
Within --> End(["Response"])
Outside --> End
```

**Diagram sources**
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)
- [schema.sql:160-179](file://database/schema.sql#L160-L179)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)

**Section sources**
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)

### Anti-Spoofing Mechanisms
The middleware implements multiple checks to detect spoofed or unrealistic movement:

- Drift anomaly detection: If buffered coordinates have near-zero variance, it suggests static spoofing.
- Impossible speed detection: Computes straight-line distance over time; if speed exceeds walking thresholds, it flags the event.
- Pedometer mismatch: Compares step count against geographical distance; inconsistencies indicate potential spoofing.
- Trust profile updates: Adjusts user trust scores and marks users flagged when thresholds are breached.

```mermaid
flowchart TD
Start(["New Location Event"]) --> BufferCheck["Buffer Variance Check"]
BufferCheck --> DriftAnomaly{"Variance < threshold?"}
DriftAnomaly --> |Yes| FlagDrift["Flag drift_anomaly<br/>Reduce trust score"]
DriftAnomaly --> |No| LastEvent["Read last LocationEvent"]
LastEvent --> SpeedCalc["Compute distance/time -> speed"]
SpeedCalc --> SpeedViolation{"speed > walking limit?"}
SpeedViolation --> |Yes| FlagSpeed["Flag speed_violation<br/>Reduce trust score"]
SpeedViolation --> |No| StepCheck["Compare steps vs distance"]
StepCheck --> StepMismatch{"steps inconsistent?"}
StepMismatch --> |Yes| FlagSteps["Flag pedometer_mismatch<br/>Reduce trust score"]
StepMismatch --> |No| UpdateTrust["Update user trust score"]
FlagDrift --> UpdateTrust
FlagSpeed --> UpdateTrust
FlagSteps --> UpdateTrust
UpdateTrust --> LogEvent["Create LocationEvent"]
LogEvent --> TrustLog{"Suspicious?"}
TrustLog --> |Yes| Deny["Deny interaction<br/>Return 403"]
TrustLog --> |No| Allow["Allow request"]
```

**Diagram sources**
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)
- [schema.sql:376-390](file://database/schema.sql#L376-L390)

**Section sources**
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)
- [spoofing-detection.md:1-46](file://warg-docs/docs/2-architecture-and-design/spoofing-detection.md#L1-L46)

### Example Spatial SQL Patterns
While specific query strings are not included here, the following patterns are used in the codebase:

- Creating POINT geometry with SRID 4326:
  - Use ST_GeomFromText('POINT(lon lat)', 4326) to insert valid geographic points.
- Computing distances between points:
  - Use ST_Distance_Sphere(location, ST_GeomFromText('POINT(lon lat)', 4326)) to get meters.
- Geofencing:
  - Compare computed distance against validation_radius_m to determine proximity.

These patterns appear in controller logic and test utilities.

**Section sources**
- [gameController.js:177-191](file://server/src/controllers/gameController.js#L177-L191)
- [test_loc.js:6-10](file://server/test_loc.js#L6-L10)

## Dependency Analysis
Spatial data flows from client input through middleware and controller layers into MySQL, leveraging spatial functions and indexes.

```mermaid
graph LR
Client["Client"] --> API["Express API"]
API --> MW["Anti-Spoofing Middleware"]
API --> CTRL["Game Controller"]
MW --> DB["MySQL (SRID 4326)"]
CTRL --> DB
DB --> WAYPOINTS["waypoints.location"]
DB --> LOC_EVENTS["location_events.location"]
```

**Diagram sources**
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)
- [schema.sql:160-179](file://database/schema.sql#L160-L179)
- [schema.sql:354-372](file://database/schema.sql#L354-L372)

**Section sources**
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)
- [gameController.js:163-201](file://server/src/controllers/gameController.js#L163-L201)

## Performance Considerations
- Spatial Indexes:
  - SPATIAL INDEX on waypoints.location and location_events.location accelerates proximity scans and range queries.
- Query Optimization:
  - Prefer ST_Distance_Sphere for spherical distance calculations in meters.
  - Filter by user_id and recorded_at using composite indexes to reduce scan size for time-series analysis.
- Partitioning Strategy:
  - For high-volume location_events, consider partitioning by recorded_at ranges to improve write and read performance.
- Accuracy Filtering:
  - Use accuracy_m to filter out low-quality GPS readings before processing or aggregating metrics.
- Trust Score Updates:
  - Batch trust score adjustments and avoid excessive writes during rapid location bursts.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:

- Incorrect Point Coordinate Order:
  - Ensure POINT(lon lat) order matches MySQL expectations; tests demonstrate correct usage.
- Missing SRID:
  - Always specify SRID 4326 when creating POINT geometries to maintain consistent coordinate systems.
- Excessive Suspicious Flags:
  - Review drift thresholds and walking speed limits; adjust parameters if legitimate movement is being rejected.
- Trust Score Anomalies:
  - Inspect trust_events for reasons like speed_violation or drift_anomaly; verify pedometer integration accuracy.

**Section sources**
- [test_loc.js:6-10](file://server/test_loc.js#L6-L10)
- [antiSpoofing.js:27-165](file://server/src/middleware/antiSpoofing.js#L27-L165)

## Conclusion
The WARG Platform’s spatial data handling leverages MySQL’s geospatial capabilities with SRID 4326 POINT geometries to support accurate geofencing, proximity checks, and robust anti-spoofing mechanisms. Proper indexing, careful query design, and behavioral trust profiling ensure reliable performance and integrity for large-scale location data.

[No sources needed since this section summarizes without analyzing specific files]